<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Shopify\Clients\Graphql;
use Shopify\Clients\HttpResponse;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('shopify.auth')->group(function () {
    Route::get('/auth/session', function (Request $request) {
        $session = $request->get('shopifySession');

        return response()->json([
            'shop' => $session->getShop(),
            'expires_at' => $session->getExpiresAt(),
        ]);
    });

    Route::get('/dashboard', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();

        $productsCount = DB::table('products_cache')->where('shop_domain', $shop)->count();
        $productsWithImages = DB::table('products_cache')->where('shop_domain', $shop)->whereNotNull('image_url')->count();
        $productsWithMeta = DB::table('products_cache')->where('shop_domain', $shop)->whereNotNull('meta_title')->whereNotNull('meta_description')->count();
        
        $activeProductsCount = DB::table('products_cache')->where('shop_domain', $shop)->where('status', 'active')->count();
        $draftProductsCount = DB::table('products_cache')->where('shop_domain', $shop)->where('status', 'draft')->count();
        $totalInventory = DB::table('inventory_cache')
            ->join('products_cache', 'inventory_cache.product_cache_id', '=', 'products_cache.id')
            ->where('products_cache.shop_domain', $shop)
            ->sum('available');

        $completeness = $productsCount > 0 ? round(($productsWithImages / $productsCount) * 100) : 100;
        $seoScore = $productsCount > 0 ? round(($productsWithMeta / $productsCount) * 100) : 100;
        $imagesScore = $productsCount > 0 ? round(($productsWithImages / $productsCount) * 100) : 100;
        
        $healthScoreValue = round(($completeness + $seoScore + $imagesScore + 100 + 100) / 5);

        return response()->json([
            'HEALTH_SCORE' => [
                'value' => $healthScoreValue,
                'label' => $healthScoreValue > 80 ? 'Good' : ($healthScoreValue > 50 ? 'Fair' : 'Poor'),
                'summary' => "Your catalog health is " . ($healthScoreValue > 80 ? 'good' : 'needs improvement') . ".",
                'detail' => "Keep going! $healthScoreValue% of your catalog meets quality and completeness standards.",
            ],
            'KPIS' => [
                ['label' => 'Total Products', 'value' => (string) $productsCount, 'change' => ''],
                ['label' => 'Active Products', 'value' => (string) $activeProductsCount, 'change' => ''],
                ['label' => 'Draft Products', 'value' => (string) $draftProductsCount, 'change' => ''],
                ['label' => 'Total Inventory', 'value' => (string) $totalInventory, 'change' => ''],
            ],
            'BULK_JOBS' => [],
            'SYNC_ACTIVITY' => [],
            'IMPORT_EXPORT' => [],
            'AI_USAGE' => [
                'rangeLabel' => 'This month',
                'percent' => 0,
                'used' => '0',
                'total' => '4,000',
                'resetLabel' => 'Credits reset on 1st',
                'features' => [],
            ],
        ]);
    });

    Route::get('/products', function (Request $request) {
        $query = strtolower((string) $request->query('search', ''));
        $shop = $request->get('shopifySession')->getShop();
        
        $products = DB::table('products_cache')
            ->where('shop_domain', $shop)
            ->when($query !== '', fn ($builder) => $builder->where(function ($products) use ($query) {
                $products->whereRaw('LOWER(title) LIKE ?', ["%$query%"])
                    ->orWhereRaw('LOWER(vendor) LIKE ?', ["%$query%"])
                    ->orWhereRaw('LOWER(handle) LIKE ?', ["%$query%"]);
            }))
            ->orderBy('title')
            ->get();

        $client = new Graphql($shop, $request->get('shopifySession')->getAccessToken());
        $realTimeData = [];
        
        $productGids = $products->pluck('product_gid')->filter()->toArray();
        if (!empty($productGids)) {
            $chunks = array_chunk($productGids, 20);
            foreach ($chunks as $chunk) {
                $gidChunk = array_map(function($id) { return strpos($id, 'gid://') === 0 ? $id : "gid://shopify/Product/{$id}"; }, $chunk);
                $idsString = implode('","', $gidChunk);
                $graphqlQuery = <<<GRAPHQL
                query {
                    nodes(ids: ["$idsString"]) {
                        ... on Product {
                            id
                            title
                            descriptionHtml
                            tags
                            status
                            productType
                            vendor
                            templateSuffix
                            publishedAt
                            createdAt
                            status
                            handle
                            seo { title description }
                            media(first: 1) { nodes { preview { image { url } } } }
                            publications(first: 10) { nodes { channel { name } } }
                            category: metafield(namespace: "custom", key: "category") { value }
                            z8_offers: metafield(namespace: "custom", key: "z8_offers") { value }
                            testing: metafield(namespace: "custom", key: "testing") { value }
                            productCategory { productTaxonomyNode { fullName } }
                            variants(first: 50) {
                                nodes {
                                    id
                                    title
                                    price
                                    compareAtPrice
                                    sku
                                    barcode
                                    inventoryQuantity
                                    taxable
                                    inventoryPolicy
                                    unitPriceMeasurement {
                                        measuredType
                                        quantityValue
                                        quantityUnit
                                        referenceValue
                                        referenceUnit
                                    }
                                    testing: metafield(namespace: "custom", key: "testing") { value }
                                    inventoryItem {
                                        tracked
                                        unitCost { amount }
                                        measurement { weight { value unit } }
                                        harmonizedSystemCode
                                        countryCodeOfOrigin
                                    }
                                }
                            }
                        }
                    }
                }
GRAPHQL;
                try {
                    $response = $client->query(['query' => $graphqlQuery]);
                    $body = $response->getDecodedBody();
                    file_put_contents(public_path("graphql_debug.json"), json_encode(["query" => $graphqlQuery, "body" => $body]));
                    file_put_contents("/tmp/graphql_debug.txt", json_encode($body));
                    if (isset($body["errors"])) { \Log::error("GraphQL Body Errors: " . json_encode($body["errors"])); }
                    
                    if (isset($body['data']['nodes'])) {
                        foreach ($body['data']['nodes'] as $node) {
                            if ($node) {
                                // Store by numeric ID to match DB
                                $numericId = preg_replace('/^gid:\/\/shopify\/Product\//', '', $node['id']);
                                $realTimeData[$numericId] = $node;
                                $realTimeData[$node['id']] = $node; // store both just in case
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error("GraphQL Error fetching real-time data: " . $e->getMessage());
                }
            }
        }

        $allProductIds = $products->pluck('id')->toArray();
        $allVariants = DB::table('variants_cache')->whereIn('product_cache_id', $allProductIds)->get();
        $allInventory = DB::table('inventory_cache')->whereIn('variant_cache_id', $allVariants->pluck('id'))->get();

        $variantsByProduct = [];
        foreach ($allVariants as $v) {
            $vArray = (array)$v;
            $vArray['inventory'] = $allInventory->where('variant_cache_id', $v->id)->sum('available');
            $variantsByProduct[$v->product_cache_id][] = $vArray;
        }

        $mappedProducts = $products->map(function ($product) use ($realTimeData, $variantsByProduct) {
            $rt = $realTimeData[$product->product_gid] ?? null;
            
            // Build the variant list by merging cache + real-time
            $mergedVariants = [];
            $rtVariants = [];
            if ($rt && isset($rt['variants']['nodes'])) {
                foreach ($rt['variants']['nodes'] as $rtv) {
                    $rtVariants[$rtv['id']] = $rtv;
                    $numId = preg_replace('/^gid:\/\/shopify\/ProductVariant\//', '', $rtv['id']);
                    $rtVariants[$numId] = $rtv;
                }
            }
            
            foreach ($variantsByProduct[$product->id] ?? [] as $v) {
                $gid = $v['variant_gid'] ?? null;
                $rtv = $rtVariants[$gid] ?? null;
                
                $mergedVariants[] = [
                    'id' => $v['id'],
                    'title' => $rtv['title'] ?? $v['title'],
                    'sku' => $rtv['sku'] ?? $v['sku'],
                    'price' => $rtv['price'] ?? $v['price'],
                    'inventory' => $rtv['inventoryQuantity'] ?? $v['inventory'],
                    'compare_at_price' => $rtv['compareAtPrice'] ?? '',
                    'barcode' => $rtv['barcode'] ?? '',
                    'cost_per_item' => (isset($rtv['inventoryItem']['unitCost']['amount']) ? $rtv['inventoryItem']['unitCost']['amount'] : ''),
                    'hs_code' => (isset($rtv['inventoryItem']['harmonizedSystemCode']) ? $rtv['inventoryItem']['harmonizedSystemCode'] : ''),
                    'origin' => (isset($rtv['inventoryItem']['countryCodeOfOrigin']) ? $rtv['inventoryItem']['countryCodeOfOrigin'] : ''),
                    'testing' => (isset($rtv['testing']['value']) && $rtv['testing']['value'] === 'true') ? 'true' : 'false',
                    'charge_taxes' => (isset($rtv['taxable']) && $rtv['taxable']) ? 'true' : 'false',
                    'continue_selling' => (isset($rtv['inventoryPolicy']) && $rtv['inventoryPolicy'] === 'CONTINUE') ? 'true' : 'false',
                    'track_quantity' => (isset($rtv['inventoryItem']['tracked']) && $rtv['inventoryItem']['tracked']) ? 'true' : 'false',
                    'weight_unit' => isset($rtv['inventoryItem']['measurement']['weight']['unit']) ? (
                        $rtv['inventoryItem']['measurement']['weight']['unit'] === 'KILOGRAMS' ? 'kg' : (
                        $rtv['inventoryItem']['measurement']['weight']['unit'] === 'GRAMS' ? 'g' : (
                        $rtv['inventoryItem']['measurement']['weight']['unit'] === 'POUNDS' ? 'lb' : (
                        $rtv['inventoryItem']['measurement']['weight']['unit'] === 'OUNCES' ? 'oz' : 'kg')))
                    ) : 'kg',
                    'weight_val' => $rtv['inventoryItem']['measurement']['weight']['value'] ?? null,
                    'unit_price' => isset($rtv['unitPriceMeasurement']) ? json_encode([
                        'totalMeasure' => $rtv['unitPriceMeasurement']['quantityValue'],
                        'totalUnit' => $rtv['unitPriceMeasurement']['quantityUnit'],
                        'baseMeasure' => $rtv['unitPriceMeasurement']['referenceValue'],
                        'baseUnit' => $rtv['unitPriceMeasurement']['referenceUnit']
                    ]) : null,
                ];
            }
            
            $v1 = $mergedVariants[0] ?? [];
            
            return [
                'id' => $product->id,
                'title' => $rt['title'] ?? $product->title,
                'description' => isset($rt['descriptionHtml']) ? strip_tags($rt['descriptionHtml']) : '',
                'product_type' => $rt['productType'] ?? ($product->product_type ?? '—'),
                'product_category' => $rt['productCategory']['productTaxonomyNode']['fullName'] ?? '—',
                'testing' => (isset($rt['testing']['value']) && $rt['testing']['value'] === 'true') ? 'true' : 'false',
                'online_store_scheduled' => 'false',
                'vendor' => $rt['vendor'] ?? ($product->vendor ?: '—'),
                'status' => isset($rt['status']) ? strtolower($rt['status']) : $product->status,
                'tags' => $rt['tags'] ?? ($product->tags ? json_decode($product->tags, true) : []),
                'template' => $rt['templateSuffix'] ?? 'product',
                'published_at' => ($rt['publishedAt'] ?? null) ? date('Y-m-d', strtotime($rt['publishedAt'])) : ( (isset($rt['status']) && $rt['status'] === 'ACTIVE') || strtolower($product->status) === 'active' ? (isset($rt['createdAt']) ? date('Y-m-d', strtotime($rt['createdAt'])) : '') : '' ),
                'handle' => $rt['handle'] ?? $product->handle,
                'meta_title' => $rt['seo']['title'] ?? $product->meta_title,
                'meta_description' => $rt['seo']['description'] ?? $product->meta_description,
                'image_url' => $rt['media']['nodes'][0]['preview']['image']['url'] ?? $product->image_url,
                'media' => $rt['media']['nodes'][0]['preview']['image']['url'] ?? $product->image_url,
                'sales_channels' => isset($rt['publications']['nodes']) ? implode(', ', array_map(function($p) { return $p['channel']['name'] ?? 'Online Store'; }, $rt['publications']['nodes'])) : '—',
                'variants_list' => $mergedVariants,
                // Top level fallbacks for the product row
                'sku' => $v1['sku'] ?? '',
                'price' => $v1['price'] ?? '',
                'compare_at_price' => $v1['compare_at_price'] ?? '',
                'cost_per_item' => $v1['cost_per_item'] ?? '',
                'barcode' => $v1['barcode'] ?? '',
                'weight' => isset($v1['weight_val']) ? $v1['weight_val'] : ($v1['weight'] ?? ''),
                'weight_unit' => $v1['weight_unit'] ?? 'kg',
                'inventory' => $v1['inventory'] ?? 0,
                'hs_code' => $v1['hs_code'] ?? '',
                'origin' => $v1['origin'] ?? '',
                'charge_taxes' => $v1['charge_taxes'] ?? 'false',
                'continue_selling' => $v1['continue_selling'] ?? 'false',
                'track_quantity' => $v1['track_quantity'] ?? 'false',
                'unit_price' => $v1['unit_price'] ?? null,
                'metafield_category' => $rt['category']['value'] ?? '—',
                'metafield_z8' => $rt['z8_offers']['value'] ?? '—',
            ];
        });

        return response()->json(['data' => $mappedProducts, 'meta' => ['total' => $mappedProducts->count(), 'page' => 1]]);
    });

    Route::post('/products/{id}/image', function (Request $request, $id) {
        $shop = $request->get('shopifySession')->getShop();
        $request->validate([
            'image' => 'required|file|image|max:10240',
        ]);

        $product = DB::table('products_cache')
            ->where('id', $id)
            ->where('shop_domain', $shop)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found.'], 404);
        }

        $uploadDirectory = public_path('assets/uploads');
        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0755, true);
        }

        $file = $request->file('image');
        $filename = uniqid('product-image-', true) . '.' . $file->getClientOriginalExtension();
        $file->move($uploadDirectory, $filename);
        $imageUrl = asset('assets/uploads/' . $filename);

        DB::table('products_cache')
            ->where('id', $id)
            ->where('shop_domain', $shop)
            ->update([
                'image_url' => $imageUrl,
                'image_name' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                'updated_at' => now(),
            ]);

        return response()->json(['success' => true, 'image_url' => $imageUrl]);
    });

    Route::put('/products/{id}', function (Request $request, $id) {
        $shop = $request->get('shopifySession')->getShop();
        
        $realId = $id;
        $isVariant = false;
        if (str_starts_with($id, 'v_')) {
            $isVariant = true;
            $realId = substr($id, 2);
        } elseif (str_starts_with($id, 'p_')) {
            $realId = substr($id, 2);
        }

        if ($isVariant) {
            $variantInput = $request->only(['price', 'sku', 'title', 'inventory', 'barcode', 'weight', 'compare_at_price', 'cost_per_item', 'hs_code', 'origin', 'testing']);
            if (!empty($variantInput)) {
                $variantInput['updated_at'] = now();
                DB::table('variants_cache')->where('id', $realId)->update($variantInput);
            }
        } else {
            $productInput = $request->only(['title', 'vendor', 'status', 'tags', 'image_url', 'handle']);
            if (!empty($productInput)) {
                $productInput['updated_at'] = now();
                DB::table('products_cache')->where('id', $realId)->where('shop_domain', $shop)->update($productInput);
            }
            
            $variantInput = $request->only(['price', 'sku', 'inventory', 'compare_at_price', 'barcode', 'weight', 'cost_per_item', 'hs_code', 'origin']);
            if ($request->has('variant_title')) {
                $variantInput['title'] = $request->input('variant_title');
            }
            if (!empty($variantInput)) {
                $variantInput['updated_at'] = now();
                DB::table('variants_cache')->where('product_cache_id', $realId)->limit(1)->update($variantInput);
            }
        }

        return response()->json(['success' => true]);
    });

    Route::post('/products/create', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());

        $input = [
            'title' => $request->input('title'),
            'descriptionHtml' => $request->input('description'),
            'vendor' => $request->input('vendor'),
            'productType' => $request->input('productType'),
            'status' => strtoupper($request->input('status', 'ACTIVE')),
        ];

        if ($request->filled('urlHandle')) {
            $input['handle'] = $request->input('urlHandle');
        }

        if ($request->filled('seoTitle') || $request->filled('seoDescription')) {
            $input['seo'] = [
                'title' => $request->input('seoTitle'),
                'description' => $request->input('seoDescription'),
            ];
        }

        $variantInput = [];
        if ($request->filled('price')) $variantInput['price'] = $request->input('price');
        if ($request->filled('compareAtPrice')) $variantInput['compareAtPrice'] = $request->input('compareAtPrice');
        if ($request->filled('sku')) $variantInput['sku'] = $request->input('sku');
        if ($request->filled('barcode')) $variantInput['barcode'] = $request->input('barcode');

        $inventoryItemInput = [];
        if ($request->filled('costPerItem')) $inventoryItemInput['cost'] = $request->input('costPerItem');
        if ($request->boolean('continueSelling')) $inventoryItemInput['tracked'] = true; // Simplified
        
        if (!empty($inventoryItemInput)) {
            $variantInput['inventoryItem'] = $inventoryItemInput;
        }

        if (!empty($variantInput)) {
            $input['variants'] = [$variantInput];
        }

        $query = <<<'GRAPHQL'
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id title handle vendor status tags
      featuredImage { url }
      seo { title description }
      variants(first: 10) {
        nodes {
          id title sku price
          inventoryItem { id }
        }
      }
    }
    userErrors { field message }
  }
}
GRAPHQL;

        try {
            $response = $client->query([
                'query' => $query,
                'variables' => ['input' => $input],
            ]);
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Shopify could not be reached.'], 400);
        }

        $body = $response->getDecodedBody();
                    file_put_contents(public_path("graphql_debug.json"), json_encode(["query" => $graphqlQuery, "body" => $body]));
                    file_put_contents("/tmp/graphql_debug.txt", json_encode($body));
                    if (isset($body["errors"])) { \Log::error("GraphQL Body Errors: " . json_encode($body["errors"])); }

        if (isset($body['errors']) || !empty($body['data']['productCreate']['userErrors'])) {
            $errors = $body['errors'] ?? $body['data']['productCreate']['userErrors'];
            return response()->json(['message' => 'Failed to create product', 'errors' => $errors], 400);
        }

        $product = $body['data']['productCreate']['product'];
        $shopDomain = $session->getShop();

        // Update local DB cache
        DB::table('products_cache')->updateOrInsert(
            ['shop_domain' => $shopDomain, 'product_gid' => $product['id']],
            [
                'title' => $product['title'],
                'handle' => $product['handle'],
                'vendor' => $product['vendor'],
                'status' => strtolower($product['status']),
                'tags' => json_encode($product['tags']),
                'image_url' => $product['featuredImage']['url'] ?? null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['message' => 'Product created successfully', 'product' => $product]);
    });

    Route::post('/sync/pull', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());
        $shopDomain = $session->getShop();
        $cursor = null;
        $synced = 0;

        do {
            try {
                $response = $client->query([
                    'query' => <<<'GRAPHQL'
query ProductSync($cursor: String) {
  products(first: 10, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle vendor status tags
      featuredImage { url }
      seo { title description }
                            publications(first: 10) { nodes { channel { name } } }
                            testing: metafield(namespace: "custom", key: "testing") { value }
                            productCategory { productTaxonomyNode { fullName } }
            variants(first: 50) {
                nodes {
                    id title sku price
                    inventoryItem {
                        id
                        inventoryLevels(first: 10) {
                            nodes {
                                location { id name }
                                quantities(names: ["available"]) { name quantity }
                            }
                        }
                    }
                }
      }
    }
  }
}
GRAPHQL,
                    'variables' => ['cursor' => $cursor],
                ]);
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'Shopify could not be reached. Check the store connection and try again.',
                ], 400);
            }
            $body = HttpResponse::fromResponse($response)->getDecodedBody();

            if ($response->getStatusCode() !== 200 || isset($body['errors'])) {
                return response()->json(['message' => 'Shopify catalog sync failed: ' . json_encode($body['errors'] ?? []), 'errors' => $body['errors'] ?? []], 400);
            }

            $connection = $body['data']['products'];
            foreach ($connection['nodes'] as $product) {
                DB::table('products_cache')->updateOrInsert(
                    ['shop_domain' => $shopDomain, 'product_gid' => $product['id']],
                    [
                        'title' => $product['title'],
                        'handle' => $product['handle'],
                        'vendor' => $product['vendor'],
                        'status' => strtolower($product['status']),
                        'tags' => json_encode($product['tags']),
                        'image_url' => $product['featuredImage']['url'] ?? null,
                        'meta_title' => $product['seo']['title'] ?? null,
                        'meta_description' => $product['seo']['description'] ?? null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
                $cacheId = DB::table('products_cache')->where('shop_domain', $shopDomain)->where('product_gid', $product['id'])->value('id');

                foreach ($product['variants']['nodes'] as $variant) {
                    DB::table('variants_cache')->updateOrInsert(
                        ['variant_gid' => $variant['id']],
                        [
                            'product_cache_id' => $cacheId,
                            'inventory_item_gid' => $variant['inventoryItem']['id'] ?? null,
                            'title' => $variant['title'] ?? null,
                            'sku' => $variant['sku'] ?? null,
                            'price' => $variant['price'] ?? null,
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                    $variantId = DB::table('variants_cache')->where('variant_gid', $variant['id'])->value('id');

                    foreach ($variant['inventoryItem']['inventoryLevels']['nodes'] ?? [] as $level) {
                        $available = collect($level['quantities'] ?? [])->firstWhere('name', 'available')['quantity'] ?? 0;
                        DB::table('inventory_cache')->updateOrInsert(
                            ['product_cache_id' => $cacheId, 'variant_cache_id' => $variantId, 'location_gid' => $level['location']['id']],
                            [
                                'location_name' => $level['location']['name'] ?? null,
                                'available' => (int) $available,
                                'updated_at' => now(),
                                'created_at' => now(),
                            ]
                        );
                    }
                }
                $synced++;
            }

            $cursor = $connection['pageInfo']['hasNextPage'] ? $connection['pageInfo']['endCursor'] : null;
        } while ($cursor !== null);

        return response()->json(['message' => 'Catalog sync completed', 'synced' => $synced, 'completed_at' => now()->toIso8601String()]);
    });

    Route::post('/sync/push', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());
        
        $searchQuery = $request->input('search', '');

        $query = <<<GRAPHQL
        query {
            products(first: 50, query: \$search) {
                edges {
                    node {
                        id
                        title
                        handle
                        vendor
                        status
                        media(first: 10) {
                            edges {
                                node {
                                    ... on MediaImage {
                                        image {
                                            url
                                            altText
                                        }
                                    }
                                }
                            }
                        }
                        variants(first: 10) {
                            edges {
                                node {
                                    sku
                                    inventoryQuantity
                                    testing: metafield(namespace: "custom", key: "testing") { value }
                                    price
                                }
                            }
                        }
                    }
                }
            }
        }
GRAPHQL;

        try {
            $response = $client->query(['query' => $query, 'variables' => ['search' => "*$searchQuery*"]]);
            $body = $response->getDecodedBody();
                    file_put_contents(public_path("graphql_debug.json"), json_encode(["query" => $graphqlQuery, "body" => $body]));
                    file_put_contents("/tmp/graphql_debug.txt", json_encode($body));
                    if (isset($body["errors"])) { \Log::error("GraphQL Body Errors: " . json_encode($body["errors"])); }
            
            $formattedProducts = collect($body['data']['products']['edges'])->map(function ($edge) {
                $node = $edge['node'];
                
                // Get the first image URL if it exists
                $imageUrl = null;
                if (!empty($node['media']['edges'])) {
                    $media = $node['media']['edges'][0]['node'];
                    $imageUrl = $media['image']['url'] ?? null;
                }
                
                // Get SKU from first variant
                $sku = null;
                if (!empty($node['variants']['edges'])) {
                    $sku = $node['variants']['edges'][0]['node']['sku'] ?? null;
                }
                
                return [
                    'id' => (int) str_replace('gid://shopify/Product/', '', $node['id']),
                    'product_gid' => $node['id'],
                    'title' => $node['title'],
                    'sku' => $sku,
                    'image_url' => $imageUrl
                ];
            })->toArray();
            
            return response()->json(['data' => $formattedProducts]);
        } catch (\Exception $e) {
            \Log::error("GraphQL Error: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch products from Shopify'], 500);
        }
    });

    Route::get('/files', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());
        
        $query = <<<GRAPHQL
        query {
            files(first: 100, query: "media_type:IMAGE") {
                edges {
                    node {
                        ... on MediaImage {
                            id
                            image {
                                url
                                altText
                            }
                        }
                    }
                }
            }
        }
GRAPHQL;

        try {
            $response = $client->query(['query' => $query]);
            $body = $response->getDecodedBody();
                    file_put_contents(public_path("graphql_debug.json"), json_encode(["query" => $graphqlQuery, "body" => $body]));
                    file_put_contents("/tmp/graphql_debug.txt", json_encode($body));
                    if (isset($body["errors"])) { \Log::error("GraphQL Body Errors: " . json_encode($body["errors"])); }
            
            $graphqlData = $body['data'] ?? [];
            $formattedFiles = collect($graphqlData['files']['edges'] ?? [])->map(function ($edge) {
                $node = $edge['node'] ?? [];
                $image = $node['image'] ?? [];
                return [
                    'id' => $node['id'] ?? null,
                    'url' => $image['url'] ?? null,
                    'altText' => $image['altText'] ?? null,
                    'source' => 'Shopify Files',
                ];
            })->filter(function ($file) {
                return !empty($file['url']);
            });

            $productImages = DB::table('products_cache')
                ->where('shop_domain', $session->getShop())
                ->whereNotNull('image_url')
                ->get(['id', 'title', 'image_url'])
                ->map(function ($product) {
                    return [
                        'id' => 'cached-product-' . $product->id,
                        'url' => $product->image_url,
                        'altText' => $product->title,
                        'productTitle' => $product->title,
                        'source' => 'Product image',
                    ];
                })
                ->filter(function ($file) {
                    return !empty($file['url']);
                });

            $formattedFiles = $formattedFiles
                ->concat($productImages)
                ->unique('url')
                ->values()
                ->toArray();
            
            return response()->json(['data' => $formattedFiles]);
        } catch (\Exception $e) {
            \Log::error("GraphQL Error fetching files: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch files from Shopify'], 500);
        }
    });

    Route::post('/sync/push', function (Request $request) {  // Fetch up to 10 recently updated products to avoid rate limits
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());

        $products = DB::table('products_cache')
            ->where('shop_domain', $session->getShop())
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get();
            
        $pushed = 0;

        foreach ($products as $product) {
            try {
                // Determine Shopify status
                $status = strtoupper($product->status) === 'ACTIVE' ? 'ACTIVE' : 'DRAFT';
                
                $response = $client->query([
                    'query' => <<<'GRAPHQL'
mutation productUpdate($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id }
    userErrors { field message }
  }
}
GRAPHQL,
                    'variables' => [
                        'input' => [
                            'id' => $product->product_gid,
                            'title' => $product->title,
                            'vendor' => $product->vendor,
                            'status' => $status
                        ]
                    ],
                ]);
                
                // Sync the primary variant
                $variant = DB::table('variants_cache')->where('product_cache_id', $product->id)->first();
                if ($variant) {
                    $client->query([
                        'query' => <<<'GRAPHQL'
mutation productVariantUpdate($input: ProductVariantInput!) {
  productVariantUpdate(input: $input) {
    productVariant { id }
    userErrors { field message }
  }
}
GRAPHQL,
                        'variables' => [
                            'input' => [
                                'id' => $variant->variant_gid,
                                'sku' => $variant->sku,
                                'price' => $variant->price
                            ]
                        ]
                    ]);
                }
                
                $pushed++;
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return response()->json(['message' => 'Push sync completed successfully', 'pushed' => $pushed, 'completed_at' => now()->toIso8601String()]);
    });

    Route::get('/inventory', function (Request $request) {
        $rows = DB::table('inventory_cache')
            ->join('products_cache', 'products_cache.id', '=', 'inventory_cache.product_cache_id')
            ->leftJoin('variants_cache', 'variants_cache.id', '=', 'inventory_cache.variant_cache_id')
            ->where('products_cache.shop_domain', $request->get('shopifySession')->getShop())
            ->select('inventory_cache.id', 'products_cache.title as product', 'variants_cache.sku', 'inventory_cache.location_name as location', 'inventory_cache.available')
            ->orderBy('products_cache.title')
            ->get();

        return response()->json(['data' => $rows]);
    });

    Route::post('/inventory/adjust', function (Request $request) {
        $data = $request->validate([
            'inventory_id' => ['required', 'integer', 'min:1'],
            'mode' => ['required', 'in:increase,decrease,set'],
            'quantity' => ['required', 'integer', 'min:0'],
        ]);

        return response()->json(['message' => 'Inventory adjustment queued', 'data' => $data], 202);
    });

    Route::get('/notifications', function () {
        return response()->json(['data' => [
            ['id' => 1, 'category' => 'inventory', 'title' => 'Low stock alert', 'message' => '23 products are below threshold.', 'read' => false],
            ['id' => 2, 'category' => 'catalog', 'title' => 'Catalog sync completed', 'message' => '1,284 products checked.', 'read' => true],
        ]]);
    });

    Route::get('/automation', function (Request $request) {
        $shop = optional($request->get('shopifySession'))->getShop() ?: 'local';
        return response()->json(['data' => Cache::get("automation:$shop", [])]);
    });

    Route::post('/automation', function (Request $request) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'trigger' => ['required', 'in:product_created,product_updated,inventory_changed'],
            'action' => ['required', 'in:apply_tag,send_notification,update_collection'],
        ]);
        $shop = optional($request->get('shopifySession'))->getShop() ?: 'local';
        $rules = Cache::get("automation:$shop", []);
        $rule = array_merge(['id' => uniqid('rule_', true), 'enabled' => true], $data);
        Cache::forever("automation:$shop", array_merge($rules, [$rule]));

        return response()->json(['data' => $rule], 201);
    });

    Route::get('/export', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        $format = $request->query('format', 'csv'); // Currently CSV only
        $includeImages = $request->query('include_images', 'true') === 'true';
        $includeVariants = $request->query('include_variants', 'true') === 'true';

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=products-export.csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        // Headers for CSV
        $columns = ['ID', 'Title', 'Handle', 'Vendor', 'Status', 'Price', 'SKU', 'Available Inventory'];
        if ($includeImages) {
            $columns[] = 'Image URL';
        }
        
        $dataRows = [$columns];
        DB::table('products_cache')
            ->where('shop_domain', $shop)
            ->orderBy('id')
            ->chunk(100, function ($products) use (&$dataRows, $includeImages, $includeVariants) {
                foreach ($products as $product) {
                    if ($includeVariants) {
                        $variants = DB::table('variants_cache')->where('product_cache_id', $product->id)->get();
                        if ($variants->isEmpty()) {
                            $inventory = DB::table('inventory_cache')->where('product_cache_id', $product->id)->sum('available');
                            $row = [
                                $product->product_gid,
                                $product->title,
                                $product->handle,
                                $product->vendor,
                                $product->status,
                                '',
                                '',
                                $inventory
                            ];
                            if ($includeImages) $row[] = $product->image_url;
                            $dataRows[] = $row;
                        } else {
                            foreach ($variants as $variant) {
                                $inventory = DB::table('inventory_cache')->where('variant_cache_id', $variant->id)->sum('available');
                                $row = [
                                    $product->product_gid,
                                    $product->title . ($variant->title && $variant->title != 'Default Title' ? ' - ' . $variant->title : ''),
                                    $product->handle,
                                    $product->vendor,
                                    $product->status,
                                    $variant->price,
                                    $variant->sku,
                                    $inventory
                                ];
                                if ($includeImages) $row[] = $product->image_url;
                                $dataRows[] = $row;
                            }
                        }
                    } else {
                        $inventory = DB::table('inventory_cache')->where('product_cache_id', $product->id)->sum('available');
                        $price = DB::table('variants_cache')->where('product_cache_id', $product->id)->min('price');
                        $sku = DB::table('variants_cache')->where('product_cache_id', $product->id)->first()->sku ?? '';
                        $row = [
                            $product->product_gid,
                            $product->title,
                            $product->handle,
                            $product->vendor,
                            $product->status,
                            $price,
                            $sku,
                            $inventory
                        ];
                        if ($includeImages) $row[] = $product->image_url;
                        $dataRows[] = $row;
                    }
                }
            });

        if ($format === 'xlsx') {
            $xlsx = \Shuchkin\SimpleXLSXGen::fromArray($dataRows);
            $tmpFile = tempnam(sys_get_temp_dir(), 'export_');
            $xlsx->saveAs($tmpFile);
            return response()->download($tmpFile, "products-export.xlsx", [
                "Content-type"        => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition" => "attachment; filename=products-export.xlsx",
            ])->deleteFileAfterSend(true);
        } else {
            $callback = function() use($dataRows) {
                $file = fopen('php://output', 'w');
                foreach ($dataRows as $row) {
                    fputcsv($file, $row);
                }
                fclose($file);
            };
            return response()->stream($callback, 200, $headers);
        }
    });

    Route::get('/settings', function (Request $request) {
        $shop = optional($request->get('shopifySession'))->getShop() ?: 'local';
        return response()->json(Cache::get("settings:$shop", [
            'rows_per_page' => 50,
            'low_stock_threshold' => 10,
            'notifications_enabled' => true,
        ]));
    });

    Route::put('/settings', function (Request $request) {
        $data = $request->validate([
            'rows_per_page' => ['sometimes', 'integer', 'in:25,50,100'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'notifications_enabled' => ['sometimes', 'boolean'],
        ]);
        $shop = optional($request->get('shopifySession'))->getShop() ?: 'local';
        $settings = array_merge(Cache::get("settings:$shop", []), $data);
        Cache::forever("settings:$shop", $settings);

        return response()->json($settings);
    });
});
