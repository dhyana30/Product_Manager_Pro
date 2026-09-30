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

Route::get('/product-organization-options', function (Request $request) {
    $session = $request->get('shopifySession');
    $client = new \Shopify\Clients\Graphql($session->getShop(), $session->getAccessToken());
    
    $fetchAll = function($query, $dataPath, $client) {
        $items = [];
        $hasNextPage = true;
        $cursor = null;
        
        while ($hasNextPage) {
            $variables = ['cursor' => $cursor];
            $response = $client->query(['query' => $query, 'variables' => $variables]);
            $body = $response->getDecodedBody();
            
            if (isset($body['errors'])) {
                throw new \Exception(json_encode($body['errors']));
            }
            
            $connection = $body['data'];
            foreach ($dataPath as $key) {
                $connection = $connection[$key] ?? [];
            }
            
            $edges = $connection['edges'] ?? [];
            foreach ($edges as $edge) {
                $items[] = $edge['node'];
            }
            
            $pageInfo = $connection['pageInfo'] ?? ['hasNextPage' => false];
            $hasNextPage = $pageInfo['hasNextPage'];
            if ($hasNextPage && count($edges) > 0) {
                $cursor = $edges[count($edges) - 1]['cursor'];
            }
        }
        
        return $items;
    };
    
    $fetchSimple = function($query, $dataPath, $client) {
        $response = $client->query(['query' => $query]);
        $body = $response->getDecodedBody();
        if (isset($body['errors'])) throw new \Exception(json_encode($body['errors']));
        
        $connection = $body['data'];
        foreach ($dataPath as $key) {
            $connection = $connection[$key] ?? [];
        }
        $items = [];
        $edges = $connection['edges'] ?? [];
        foreach ($edges as $edge) {
            $items[] = $edge['node'];
        }
        return $items;
    };

    // Product Types
    $typesQuery = <<<'GRAPHQL'
    query {
      shop {
        productTypes(first: 250) {
          edges {
            node
          }
        }
      }
    }
GRAPHQL;
    $types = $fetchSimple($typesQuery, ['shop', 'productTypes'], $client);

    // Vendors
    $vendorsQuery = <<<'GRAPHQL'
    query {
      shop {
        productVendors(first: 250) {
          edges {
            node
          }
        }
      }
    }
GRAPHQL;
    $vendors = $fetchSimple($vendorsQuery, ['shop', 'productVendors'], $client);

    // Tags
    $tagsQuery = <<<'GRAPHQL'
    query {
      shop {
        productTags(first: 250) {
          edges {
            node
          }
        }
      }
    }
GRAPHQL;
    $tags = $fetchSimple($tagsQuery, ['shop', 'productTags'], $client);

    // Collections
    $collectionsQuery = <<<'GRAPHQL'
    query($cursor: String) {
      collections(first: 250, after: $cursor) {
        edges {
          cursor
          node {
            id
            title
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
GRAPHQL;
    $collections = $fetchAll($collectionsQuery, ['collections'], $client);

        // Theme templates (via REST API)
    $restClient = new \Shopify\Clients\Rest($session->getShop(), $session->getAccessToken());
    $themesResponse = $restClient->get('themes');
    $themes = $themesResponse->getDecodedBody()['themes'] ?? [];
    $mainTheme = array_values(array_filter($themes, function($t) { return $t['role'] === 'main'; }))[0] ?? null;
    $templates = ['Default product'];
    
    if ($mainTheme) {
        $assetsResponse = $restClient->get("themes/{$mainTheme['id']}/assets");
        $assets = $assetsResponse->getDecodedBody()['assets'] ?? [];
        foreach ($assets as $asset) {
            if (preg_match('/^templates\/product\.(.+)\.(json|liquid)$/', $asset['key'], $m)) {
                $templates[] = $m[1];
            }
        }
    }
    
    return response()->json([
        'types' => array_values(array_unique(array_filter($types))),
        'vendors' => array_values(array_unique(array_filter($vendors))),
        'tags' => array_values(array_unique(array_filter($tags))),
        'collections' => $collections,
        'templates' => array_values(array_unique(array_filter($templates))),
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
            ->leftJoin('variants_cache', 'variants_cache.id', '=', 'inventory_cache.variant_cache_id')
            ->where('products_cache.shop_domain', $shop)
            ->whereNull('variants_cache.superseded_by_variant_cache_id')
            ->sum('available');

                $products = Illuminate\Support\Facades\DB::table('products_cache')->where('shop_domain', $shop)->get();
        $variants = Illuminate\Support\Facades\DB::table('variants_cache')
            ->whereIn('product_cache_id', $products->pluck('id'))
            ->whereNull('superseded_by_variant_cache_id')
            ->get();
        
        $missingImages = [];
        $incompleteDesc = [];
        $duplicateSkus = [];
        $missingCats = [];
        
        $skuCounts = [];
        foreach ($variants as $v) {
            if ($v->sku) $skuCounts[$v->sku] = ($skuCounts[$v->sku] ?? 0) + 1;
        }
        $duplicateSkuList = array_keys(array_filter($skuCounts, fn($c) => $c > 1));
        
        foreach ($products as $p) {
            $pVariants = $variants->where('product_cache_id', $p->id);
            
            if (!$p->image_url) $missingImages[] = $p->id;
            if (!$p->meta_description || strlen($p->meta_description) < 40) $incompleteDesc[] = $p->id;
            
            $hasDup = false;
            foreach ($pVariants as $v) {
                if ($v->sku && in_array($v->sku, $duplicateSkuList)) {
                    $hasDup = true;
                    break;
                }
            }
            if ($hasDup) $duplicateSkus[] = $p->id;
            if (!$p->collections || $p->collections === '[]') $missingCats[] = $p->id;
        }
        
        $affectedProductIds = array_unique(array_merge($missingImages, $incompleteDesc, $duplicateSkus, $missingCats));
        $affectedCountVal = count($affectedProductIds);
        
        $totalProducts = $products->count();
        $totalProducts = $totalProducts > 0 ? $totalProducts : 1;
        
        $imgScore = ($totalProducts - count($missingImages)) / $totalProducts * 100;
        $descScore = ($totalProducts - count($incompleteDesc)) / $totalProducts * 100;
        $dupScore = ($totalProducts - count($duplicateSkus)) / $totalProducts * 100;
        $catScore = ($totalProducts - count($missingCats)) / $totalProducts * 100;
        $healthScoreValue = round(($imgScore * 0.25) + ($descScore * 0.20) + ($dupScore * 0.15) + ($catScore * 0.15) + 15 + 10);

        return response()->json([
            'HEALTH_SCORE' => [
                'value' => $healthScoreValue,
                'affectedCount' => $affectedCountVal,
                'label' => $healthScoreValue > 80 ? 'Good' : ($healthScoreValue > 50 ? 'Fair' : 'Poor'),
                'summary' => "Your catalog health " . ($healthScoreValue > 80 ? 'is good' : 'needs improvement') . ".",
                'detail' => "Keep going! $healthScoreValue% of your catalog meets quality and completeness standards.",
            ],
            'KPIS' => [
                ['label' => 'Total Products', 'value' => (string) $productsCount, 'change' => ''],
                ['label' => 'Active Products', 'value' => (string) $activeProductsCount, 'change' => ''],
                ['label' => 'Draft Products', 'value' => (string) $draftProductsCount, 'change' => ''],
                ['label' => 'Total Inventory', 'value' => (string) $totalInventory, 'change' => ''],
            ],
                        'BULK_JOBS' => DB::table('bulk_jobs')
                ->where('shop_domain', $shop)
                ->orderBy('created_at', 'desc')
                ->limit(4)
                ->get()
                ->map(fn($job) => [
                    'id' => $job->id,
                    'name' => $job->job_name,
                    'type' => $job->job_type,
                    'status' => $job->status,
                    'started' => $job->started_at,
                    'records' => $job->records_affected,
                    'progress' => $job->progress,
                    'error_message' => $job->error_message
                ]),
                        'SYNC_ACTIVITY' => DB::table('bulk_jobs')
                ->where('shop_domain', $shop)
                ->whereIn('job_type', ['Catalog Sync', 'Catalog Push'])
                ->orderBy('created_at', 'desc')
                ->limit(4)
                ->get()
                ->map(fn($job) => [
                    'id' => $job->id,
                    'type' => $job->job_type,
                    'direction' => $job->job_type === 'Catalog Sync' ? 'Shopify → App' : 'App → Shopify',
                    'direction' => $job->job_type === 'Catalog Sync' ? 'From Shopify' : 'To Shopify',
                    'status' => $job->status,
                    'started' => $job->started_at,
                    'completed' => $job->completed_at,
                    'records' => $job->records_affected,
                    'error_message' => $job->error_message
                ]),
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
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 10000);
        
        $productsQuery = DB::table('products_cache')
            ->where('shop_domain', $shop)
            ->when($query !== '', fn ($builder) => $builder->where(function ($products) use ($query) {
                $products->whereRaw('LOWER(title) LIKE ?', ["%$query%"])
                    ->orWhereRaw('LOWER(vendor) LIKE ?', ["%$query%"])
                    ->orWhereRaw('LOWER(handle) LIKE ?', ["%$query%"]);
            }))
            ->orderBy('title');
            
        $total = $productsQuery->count();
        $products = $productsQuery->forPage($page, $perPage)->get();

        $allProductIds = $products->pluck('id')->toArray();
        $allVariants = DB::table('variants_cache')
            ->whereIn('product_cache_id', $allProductIds)
            ->whereNull('superseded_by_variant_cache_id')
            ->get();
        $allInventory = DB::table('inventory_cache')->whereIn('variant_cache_id', $allVariants->pluck('id'))->get();

        $variantsByProduct = [];
        foreach ($allVariants as $v) {
            $vArray = (array)$v;
            $vArray['inventory'] = $allInventory->where('variant_cache_id', $v->id)->sum('available');
            $variantsByProduct[$v->product_cache_id][] = $vArray;
        }

        $mappedProducts = $products->map(function ($product) use ($variantsByProduct, $request) {
            $mergedVariants = [];
            
            foreach ($variantsByProduct[$product->id] ?? [] as $v) {
                $mergedVariants[] = [
                    'id' => $v['id'],
                    'title' => $v['title'] ?? '',
                    'sku' => $v['sku'] ?? '',
                    'price' => $v['price'] ?? '',
                    'inventory' => $v['inventory'] ?? 0,
                    'compare_at_price' => '',
                    'barcode' => '',
                    'cost_per_item' => '',
                    'hs_code' => '',
                    'origin' => '',
                    'testing' => 'false',
                    'charge_taxes' => 'false',
                    'continue_selling' => 'false',
                    'track_quantity' => 'true',
                    'weight_unit' => 'kg',
                    'weight_val' => null,
                    'unit_price' => null,
                ];
            }
            
            $v1 = $mergedVariants[0] ?? [];
            
            $testing = 'false';
            $category = '—';
            $z8 = '—';
            
            if (!empty($product->metafields)) {
                $metafields = json_decode($product->metafields, true);
                if (is_array($metafields)) {
                    if (isset($metafields['nodes'])) {
                        foreach ($metafields['nodes'] as $mf) {
                            if (isset($mf['key'])) {
                                if ($mf['key'] === 'testing') $testing = ($mf['value'] === 'true') ? 'true' : 'false';
                                if ($mf['key'] === 'category') $category = $mf['value'] ?? '—';
                                if ($mf['key'] === 'z8_offers') $z8 = $mf['value'] ?? '—';
                            }
                        }
                    } else {
                        foreach ($metafields as $mf) {
                            if (is_array($mf) && isset($mf['key'])) {
                                if ($mf['key'] === 'testing') $testing = ($mf['value'] === 'true') ? 'true' : 'false';
                                if ($mf['key'] === 'category') $category = $mf['value'] ?? '—';
                                if ($mf['key'] === 'z8_offers') $z8 = $mf['value'] ?? '—';
                            }
                        }
                    }
                }
            }

            $collections = !empty($product->collections) ? json_decode($product->collections, true) : [];
            $collectionTitles = [];
            if (is_array($collections)) {
                if (isset($collections['nodes'])) {
                    $collectionTitles = array_map(fn($c) => $c['title'] ?? '', $collections['nodes']);
                } else {
                    $collectionTitles = array_map(fn($c) => is_array($c) ? ($c['title'] ?? '') : $c, $collections);
                }
            }
            
            return [
                'id' => $product->id,
                'created_at' => $product->created_at ? gmdate('Y-m-d\TH:i:s\Z', strtotime($product->created_at)) : null,
                'updated_at' => $product->updated_at ? gmdate('Y-m-d\TH:i:s\Z', strtotime($product->updated_at)) : null,
                'title' => $product->title,
                'description' => $product->description ?? ($product->meta_description ?? ''),
                'product_type' => $product->product_type ?? '—',
                'product_category' => $product->product_category ?? '—',
                'testing' => $product->testing ?? $testing,
                'online_store_scheduled' => $product->online_store_scheduled ?? 'false',
                'online_store_publish_date' => $product->online_store_publish_date ?? '—',
                'vendor' => $product->vendor ?: '—',
                'status' => strtolower($product->status),
                'tags' => $product->tags ? json_decode($product->tags, true) : [],
                'collections' => $collectionTitles,
                'template' => $product->template ?? 'product',
                'published_at' => strtolower($product->status) === 'active' ? (date('Y-m-d', strtotime($product->created_at))) : '',
                'handle' => $product->handle,
                'meta_title' => $product->meta_title,
                'meta_description' => $product->meta_description,
                'image_hash' => $product->image_hash ?: (function($url) {
                    if (!$url) return null;
                    if (str_contains($url, '/uploads/')) {
                        $path = public_path('uploads/' . basename(parse_url($url, PHP_URL_PATH)));
                        if (file_exists($path)) return hash_file('sha256', $path);
                    }
                    return $url;
                })($product->image_url),
                'image_url' => (function($url) {
                    if (!$url) return $url;
                    if (str_contains($url, '/uploads/')) {
                        return '/uploads/' . basename(parse_url($url, PHP_URL_PATH));
                    }
                    if (str_contains($url, '/assets/uploads/')) {
                        return '/uploads/' . basename(parse_url($url, PHP_URL_PATH));
                    }
                    return $url;
                })($product->image_url),
                'images_data' => (function($json) {
                    $arr = $json ? json_decode($json, true) : [];
                    if (!is_array($arr)) return [];
                    foreach ($arr as &$img) {
                        if (!isset($img['hash']) && !empty($img['url']) && str_contains($img['url'], '/uploads/')) {
                            $path = public_path('uploads/' . basename(parse_url($img['url'], PHP_URL_PATH)));
                            if (file_exists($path)) {
                                $img['hash'] = hash_file('sha256', $path);
                            }
                        }
                    }
                    return $arr;
                })($product->images_data),
                'media' => $product->image_url,
                'sales_channels' => $product->sales_channels ?? '—',
                'variants_list' => $mergedVariants,
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
                'metafield_category' => $category,
                'metafield_z8' => $z8,
            ];
        });

        return response()->json([
            'data' => $mappedProducts, 
            'meta' => ['total' => $total, 'page' => $page, 'per_page' => $perPage]
        ]);
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

        $uploadDirectory = public_path('uploads');
        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0755, true);
        }

        $file = $request->file('image');
        $filename = uniqid('product-image-', true) . '.' . $file->getClientOriginalExtension();
        $hash = hash_file('sha256', $file->getRealPath());
        $file->move($uploadDirectory, $filename);
        $imageUrl = '/uploads/' . $filename;
        
        $host = env('HOST');
        $scheme = $request->header('X-Forwarded-Proto', 'https');
        $absoluteImageUrl = $scheme . '://' . $host . $imageUrl;
        
        $session = $request->get('shopifySession');
        $client = new \Shopify\Clients\Graphql($session->getShop(), $session->getAccessToken());
        
        try {
            $client->query([
                'query' => 'mutation fileCreate($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id alt } } }',
                'variables' => [
                    'files' => [
                        [
                            'alt' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                            'contentType' => 'IMAGE',
                            'originalSource' => $absoluteImageUrl
                        ]
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error uploading file to Shopify: ' . $e->getMessage());
        }

        DB::table('products_cache')
            ->where('id', $id)
            ->where('shop_domain', $shop)
            ->update([
                'image_url' => $imageUrl,
                'image_hash' => $hash,
                'image_name' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                'updated_at' => now(),
                'sync_pending' => true,
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
            $variantInput = $request->only(['price', 'sku', 'title', 'barcode', 'weight', 'compare_at_price', 'cost_per_item', 'hs_code', 'origin']);
            if (!empty($variantInput)) {
                $variantInput['updated_at'] = now();
                $variantInput['sync_pending'] = true;
                DB::table('variants_cache')
                    ->where('id', $realId)
                    ->whereNull('superseded_by_variant_cache_id')
                    ->update($variantInput);
            }
        } else {
            $productInput = $request->only([
                'title',
                'vendor',
                'status',
                'tags',
                'image_url',
                'handle',
                'image_name',
                'image_alt',
                'meta_title',
                'meta_description',
                'description',
                'product_type',
                'product_category',
                'template',
                'sales_channels',
                'online_store_scheduled',
                'online_store_publish_date',
                'testing',
            ]);
            
            // Media array handling
            $mediaOrderInput = $request->input('mediaOrder');
            if ($mediaOrderInput !== null) {
                $mediaOrder = is_string($mediaOrderInput) ? json_decode($mediaOrderInput, true) : $mediaOrderInput;
                $mediaOrder = $mediaOrder ?? [];
                
                $imagesData = [];
                $imageUrl = null;
                $uploadDirectory = public_path('uploads');
                if (!is_dir($uploadDirectory)) mkdir($uploadDirectory, 0755, true);
                
                $oldImagesData = $product->images_data ? json_decode($product->images_data, true) : [];
                foreach ($mediaOrder as $item) {
                    if ($item['type'] === 'base64' && !empty($item['data'])) {
                        $base64 = $item['data'];
                        if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                            $base64 = substr($base64, strpos($base64, ',') + 1);
                            $type = strtolower($type[1]);
                            if (in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                                $decoded = base64_decode($base64);
                                if ($decoded !== false) {
                                    $filename = uniqid('product-media-', true) . '.' . $type;
                                    $filePath = $uploadDirectory . '/' . $filename;
                                    file_put_contents($filePath, $decoded);
                                    $fileHash = hash_file('sha256', $filePath);
                                    $host = env('HOST');
                                    $scheme = $request->header('X-Forwarded-Proto', 'https');
                                    $url = $scheme . '://' . $host . '/uploads/' . $filename;
                                    if (!$imageUrl) $imageUrl = $url;
                                    $imagesData[] = [
                                        'id' => 'local://Media/' . uniqid(),
                                        'url' => $url,
                                        'altText' => 'Uploaded Media',
                                        'hash' => $fileHash
                                    ];
                                }
                            }
                        }
                    } else if ($item['type'] === 'existing' && !empty($item['url'])) {
                        if (!$imageUrl) $imageUrl = $item['url'];
                        $existingUrl = $item['url'];
                        $existingHash = null;
                        $existingId = 'local://Media/' . uniqid();
                        
                        foreach ($oldImagesData as $oldImg) {
                            if (($oldImg['url'] ?? '') === $existingUrl) {
                                if (isset($oldImg['hash'])) $existingHash = $oldImg['hash'];
                                if (isset($oldImg['id'])) $existingId = $oldImg['id'];
                                break;
                            }
                        }
                        
                        if (!$existingHash && str_contains($existingUrl, '/uploads/')) {
                            $path = public_path('uploads/' . basename(parse_url($existingUrl, PHP_URL_PATH)));
                            if (file_exists($path)) {
                                $existingHash = hash_file('sha256', $path);
                            }
                        }
                        
                        $imagesData[] = [
                            'id' => $existingId,
                            'url' => $existingUrl,
                            'altText' => 'Store Media',
                            'hash' => $existingHash
                        ];
                    }
                }
                
                $productInput['image_url'] = $imageUrl;
                $productInput['images_data'] = json_encode($imagesData);
            }

            if (array_key_exists('image_url', $productInput)) {
                if ($productInput['image_url'] === null) {
                    $productInput['image_hash'] = null;
                } else {
                    $existingHash = DB::table('products_cache')->where('image_url', $productInput['image_url'])->whereNotNull('image_hash')->value('image_hash');
                    if ($existingHash) {
                        $productInput['image_hash'] = $existingHash;
                    } else if (str_contains($productInput['image_url'], '/uploads/')) {
                        $path = public_path('uploads/' . basename(parse_url($productInput['image_url'], PHP_URL_PATH)));
                        if (file_exists($path)) {
                            $productInput['image_hash'] = hash_file('sha256', $path);
                        } else {
                            $productInput['image_hash'] = null;
                        }
                    } else {
                        $productInput['image_hash'] = null;
                    }
                }
            }
            if (!empty($productInput)) {
                $productInput['updated_at'] = now();
                $productInput['sync_pending'] = true;
                DB::table('products_cache')->where('id', $realId)->where('shop_domain', $shop)->update($productInput);
            }
            
            $variantInput = $request->only(['price', 'sku', 'compare_at_price', 'barcode', 'weight', 'cost_per_item', 'hs_code', 'origin']);
            if ($request->has('variant_title')) {
                $variantInput['title'] = $request->input('variant_title');
            }
            if (!empty($variantInput)) {
                $variantInput['updated_at'] = now();
                $variantInput['sync_pending'] = true;
                DB::table('variants_cache')
                    ->where('product_cache_id', $realId)
                    ->whereNull('superseded_by_variant_cache_id')
                    ->update($variantInput);
            }
        }

        return response()->json(['success' => true]);
    });

            Route::post('/products/create', function (Request $request) {
        $session = $request->get('shopifySession');
        $shopDomain = $session->getShop();
        
        // Generate local IDs
        $localProductId = 'local://Product/' . uniqid();
        $localVariantId = 'local://ProductVariant/' . uniqid();
        $localInventoryItemId = 'local://InventoryItem/' . uniqid();

        $title = $request->input('title');
        $handle = $request->input('urlHandle');
        $handle = str_replace('products/', '', $handle);
        $handle = trim($handle, '/');
        if (empty($handle)) {
            $handle = \Illuminate\Support\Str::slug($title);
        }
        $vendor = $request->input('vendor');
        $status = strtolower($request->input('status', 'ACTIVE'));
        $description = $request->input('description', '');
        $productType = $request->input('productType');
        $productCategory = $request->input('category');
        $template = $request->input('template');
        
        $tags = [];
        if ($request->filled('tags')) {
            $tags = array_map('trim', explode(',', $request->input('tags')));
        }
        
        $metaTitle = $request->input('seoTitle');
        $metaDescription = $request->input('seoDescription');
        
        // Handle Media Uploads and Order locally
        $imagesData = [];
        $imageUrl = null;
        $uploadDirectory = public_path('uploads');
        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0755, true);
        }
        
        $files = $request->file('media') ?: [];
        $mediaOrderInput = $request->input('mediaOrder');
        
        if ($mediaOrderInput) {
            $mediaOrder = is_string($mediaOrderInput) ? json_decode($mediaOrderInput, true) : $mediaOrderInput;
            $mediaOrder = $mediaOrder ?? [];
            foreach ($mediaOrder as $item) {
                if ($item['type'] === 'base64' && !empty($item['data'])) {
                    $base64 = $item['data'];
                    if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                        $base64 = substr($base64, strpos($base64, ',') + 1);
                        $type = strtolower($type[1]);
                        if (in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                            $decoded = base64_decode($base64);
                            if ($decoded !== false) {
                                $filename = uniqid('product-media-', true) . '.' . $type;
                                $filePath = $uploadDirectory . '/' . $filename;
                                file_put_contents($filePath, $decoded);
                                $fileHash = hash_file('sha256', $filePath);
                                $host = env('HOST');
                                $scheme = $request->header('X-Forwarded-Proto', 'https');
                                $url = $scheme . '://' . $host . '/uploads/' . $filename;
                                if (!$imageUrl) $imageUrl = $url;
                                $imagesData[] = [
                                    'id' => 'local://Media/' . uniqid(),
                                    'url' => $url,
                                    'altText' => 'Uploaded Media',
                                    'hash' => $fileHash
                                ];
                            }
                        }
                    }
                } else if ($item['type'] === 'local') {
                    $fileIndex = $item['fileIndex'] ?? 0;
                    $file = $files[$fileIndex] ?? null;
                    if ($file) {
                        $filename = uniqid('product-media-', true) . '.' . $file->getClientOriginalExtension();
                        $file->move($uploadDirectory, $filename);
                        $filePath = $uploadDirectory . '/' . $filename;
                        $fileHash = file_exists($filePath) ? hash_file('sha256', $filePath) : null;
                        $host = env('HOST');
                        $scheme = $request->header('X-Forwarded-Proto', 'https');
                        $url = $scheme . '://' . $host . '/uploads/' . $filename;
                        if (!$imageUrl) $imageUrl = $url;
                        $imagesData[] = [
                            'id' => 'local://Media/' . uniqid(),
                            'url' => $url,
                            'altText' => $file->getClientOriginalName(),
                            'hash' => $fileHash
                        ];
                    }
                } else if ($item['type'] === 'existing' && !empty($item['url'])) {
                    if (!$imageUrl) $imageUrl = $item['url'];
                    $existingUrl = $item['url'];
                    $existingHash = null;
                    
                    if (str_contains($existingUrl, '/uploads/')) {
                        $path = public_path('uploads/' . basename(parse_url($existingUrl, PHP_URL_PATH)));
                        if (file_exists($path)) {
                            $existingHash = hash_file('sha256', $path);
                        }
                    }
                    
                    $imagesData[] = [
                        'id' => 'local://Media/' . uniqid(),
                        'url' => $existingUrl,
                        'altText' => 'Store Media',
                        'hash' => $existingHash
                    ];
                }
            }
        } else {
            foreach ($files as $file) {
                $filename = uniqid('product-media-', true) . '.' . $file->getClientOriginalExtension();
                $file->move($uploadDirectory, $filename);
                $filePath = $uploadDirectory . '/' . $filename;
                $fileHash = file_exists($filePath) ? hash_file('sha256', $filePath) : null;
                $host = env('HOST');
                $scheme = $request->header('X-Forwarded-Proto', 'https');
                $url = $scheme . '://' . $host . '/uploads/' . $filename;
                if (!$imageUrl) $imageUrl = $url;
                $imagesData[] = [
                    'id' => 'local://Media/' . uniqid(),
                    'url' => $url,
                    'altText' => $file->getClientOriginalName(),
                    'hash' => $fileHash
                ];
            }
        }

        // Insert into products_cache
        DB::table('products_cache')->insert([
            'shop_domain' => $shopDomain,
            'product_gid' => $localProductId,
            'title' => $title,
            'handle' => $handle,
            'vendor' => $vendor,
            'status' => $status,
            'description' => $description,
            'product_type' => $productType,
            'product_category' => $productCategory,
            'template' => $template,
            'tags' => json_encode($tags),
            'image_url' => $imageUrl,
            'images_data' => json_encode($imagesData),
            'meta_title' => $metaTitle,
            'meta_description' => $metaDescription,
            'updated_at' => now(),
            'created_at' => now(),
            'sync_pending' => true,
        ]);

        $cacheId = DB::table('products_cache')->where('shop_domain', $shopDomain)->where('product_gid', $localProductId)->value('id');

        // Variant info
        $price = $request->input('price');
        $sku = $request->input('sku');
        $compareAtPrice = $request->input('compareAtPrice');
        $barcode = $request->input('barcode');
        $weight = (float) $request->input('weight', 0);
        $weightUnit = $request->input('weightUnit', 'kg');
        $costPerItem = $request->input('costPerItem');
        $hsCode = $request->input('hsCode');
        $origin = $request->input('countryOfOrigin');
        $trackQuantity = filter_var($request->input('inventoryTracked', true), FILTER_VALIDATE_BOOLEAN);
        $continueSelling = filter_var($request->input('continueSelling', false), FILTER_VALIDATE_BOOLEAN);
        
        DB::table('variants_cache')->insert([
            'product_cache_id' => $cacheId,
            'variant_gid' => $localVariantId,
            'inventory_item_gid' => $localInventoryItemId,
            'title' => 'Default Title',
            'sku' => $sku,
            'price' => $price,
            'compare_at_price' => $compareAtPrice,
            'barcode' => $barcode,
            'weight' => $weight,
            'weight_unit' => $weightUnit,
            'cost_per_item' => $costPerItem,
            'hs_code' => $hsCode,
            'origin' => $origin,
            'track_quantity' => $trackQuantity ? 'true' : 'false',
            'continue_selling' => $continueSelling ? 'true' : 'false',
            'updated_at' => now(),
            'created_at' => now(),
            'sync_pending' => true,
        ]);
        
        $variantCacheId = DB::table('variants_cache')->where('variant_gid', $localVariantId)->value('id');

        // Inventory
        $quantitiesInput = $request->input('quantities');
        $quantities = is_string($quantitiesInput) ? json_decode($quantitiesInput, true) : ($quantitiesInput ?? []);
        
        if (!empty($quantities) && filter_var($request->input('inventoryTracked', true), FILTER_VALIDATE_BOOLEAN)) {
            foreach ($quantities as $locId => $qty) {
                DB::table('inventory_cache')->insert([
                    'product_cache_id' => $cacheId,
                    'variant_cache_id' => $variantCacheId,
                    'location_gid' => $locId,
                    'location_name' => 'Location',
                    'available' => (int) $qty,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]);
            }
        }

        return response()->json(['message' => 'Product created successfully', 'product' => ['id' => $localProductId]]);
    });
Route::post('/sync/pull', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new \Shopify\Clients\Graphql($session->getShop(), $session->getAccessToken());
        $shopDomain = $session->getShop();
        $cursor = $request->input('cursor');
        $synced = 0;
        
        $searchQuery = null;
        $syncMode = $request->input('syncMode');
        $selectedProductIds = $request->input('selectedProductIds');
        if (!empty($selectedProductIds)) {
            $gids = DB::table('products_cache')
                ->where('shop_domain', $shopDomain)
                ->whereIn('id', $selectedProductIds)
                ->pluck('product_gid')
                ->toArray();
                
            if (!empty($gids)) {
                $numericIds = array_map(function($gid) {
                    return preg_replace('/[^0-9]/', '', basename($gid));
                }, $gids);
                
                $searchQuery = implode(' OR ', array_map(function($id) {
                    return "id:{$id}";
                }, $numericIds));
            } else {
                return response()->json([
                    'message' => 'No products synced',
                    'synced' => 0,
                    'next_cursor' => null
                ]);
            }
        }
        
        $jobId = $request->input('jobId');
        if (!$jobId && !$cursor) {
            $jobId = DB::table('bulk_jobs')->insertGetId([
                'shop_domain' => $shopDomain,
                'job_name' => 'Catalog Sync (Pull)',
                'job_type' => 'Catalog Sync',
                'status' => 'Running',
                'started_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        try {
            $response = $client->query([
                'query' => <<<'GRAPHQL'
query ProductSync($cursor: String, $searchQuery: String) {
  products(first: 10, after: $cursor, query: $searchQuery) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle vendor status tags
      featuredImage { url }
      images(first: 10) { nodes { id url altText } }
      seo { title description }
      metafields(first: 20) { nodes { id namespace key value type } }
      collections(first: 10) { nodes { id title } }
      publications(first: 10) { nodes { channel { name } } }
      productCategory { productTaxonomyNode { fullName } }
      variants(first: 50) {
        pageInfo { hasNextPage endCursor }
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
                'variables' => ['cursor' => $cursor, 'searchQuery' => $searchQuery],
            ]);
        } catch (\Throwable $exception) {
            report($exception);
            if ($jobId) {
                DB::table('bulk_jobs')->where('id', $jobId)->update(['status' => 'Failed', 'error_message' => $exception->getMessage(), 'completed_at' => now()]);
            }
            return response()->json([
                'message' => 'Shopify could not be reached. Check the store connection and try again.',
            ], 400);
        }
        $body = \Shopify\Clients\HttpResponse::fromResponse($response)->getDecodedBody();

        if ($response->getStatusCode() !== 200 || isset($body['errors'])) {
            if ($jobId) {
                DB::table('bulk_jobs')->where('id', $jobId)->update(['status' => 'Failed', 'error_message' => json_encode($body['errors'] ?? []), 'completed_at' => now()]);
            }
            return response()->json(['message' => 'Shopify catalog sync failed: ' . json_encode($body['errors'] ?? []), 'errors' => $body['errors'] ?? []], 400);
        }

        $connection = $body['data']['products'];
        $productGids = array_map(fn($p) => $p['id'], $connection['nodes']);
        $existingProducts = DB::table('products_cache')->where('shop_domain', $shopDomain)->whereIn('product_gid', $productGids)->get()->keyBy('product_gid');

        foreach ($connection['nodes'] as $product) {
            $variants = $product['variants']['nodes'] ?? [];
            $variantPageInfo = $product['variants']['pageInfo'] ?? [];
            $variantCursor = $variantPageInfo['endCursor'] ?? null;
            while (!empty($variantPageInfo['hasNextPage']) && $variantCursor) {
                $variantResponse = $client->query([
                    'query' => <<<'GRAPHQL'
query ProductVariantSync($id: ID!, $cursor: String) {
  product(id: $id) {
    variants(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
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
GRAPHQL,
                    'variables' => ['id' => $product['id'], 'cursor' => $variantCursor],
                ])->getDecodedBody();

                if (!empty($variantResponse['errors']) || empty($variantResponse['data']['product']['variants'])) {
                    $variantErrors = $variantResponse['errors'] ?? [['message' => 'Shopify variant pagination returned no product data.']];
                    if ($jobId) {
                        DB::table('bulk_jobs')->where('id', $jobId)->update([
                            'status' => 'Failed',
                            'error_message' => json_encode($variantErrors),
                            'completed_at' => now(),
                        ]);
                    }
                    return response()->json([
                        'message' => 'Shopify variant sync failed: ' . json_encode($variantErrors),
                        'errors' => $variantErrors,
                    ], 400);
                }

                $nextVariantPage = $variantResponse['data']['product']['variants'];
                $variants = array_merge($variants, $nextVariantPage['nodes'] ?? []);
                $variantPageInfo = $nextVariantPage['pageInfo'] ?? [];
                $variantCursor = $variantPageInfo['endCursor'] ?? null;
                if (!empty($variantPageInfo['hasNextPage']) && !$variantCursor) {
                    $variantErrors = [['message' => 'Shopify variant pagination returned an incomplete page cursor.']];
                    if ($jobId) {
                        DB::table('bulk_jobs')->where('id', $jobId)->update([
                            'status' => 'Failed',
                            'error_message' => json_encode($variantErrors),
                            'completed_at' => now(),
                        ]);
                    }
                    return response()->json([
                        'message' => 'Shopify variant sync failed: ' . json_encode($variantErrors),
                        'errors' => $variantErrors,
                    ], 400);
                }
            }

            $existing = $existingProducts[$product['id']] ?? null;
            $newImageUrl = $product['featuredImage']['url'] ?? null;
            $hashToKeep = null;
            if ($existing && $existing->image_url && $newImageUrl) {
                $oldFilename = basename(parse_url($existing->image_url, PHP_URL_PATH));
                if ($newImageUrl === $existing->image_url || ($oldFilename && str_contains($newImageUrl, $oldFilename))) {
                    $hashToKeep = $existing->image_hash;
                }
            }

            DB::table('products_cache')->updateOrInsert(
                ['shop_domain' => $shopDomain, 'product_gid' => $product['id']],
                [
                    'title' => $product['title'],
                    'handle' => $product['handle'],
                    'vendor' => $product['vendor'],
                    'status' => strtolower($product['status']),
                    'tags' => json_encode($product['tags']),
                    'image_url' => $newImageUrl,
                    'image_hash' => $hashToKeep,
                    'meta_title' => $product['seo']['title'] ?? null,
                    'meta_description' => $product['seo']['description'] ?? null,
                    'images_data' => json_encode($product['images']['nodes'] ?? []),
                    'metafields' => json_encode($product['metafields']['nodes'] ?? []),
                    'collections' => json_encode($product['collections']['nodes'] ?? []),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
            $cacheId = DB::table('products_cache')->where('shop_domain', $shopDomain)->where('product_gid', $product['id'])->value('id');

            $shopifyVariantGids = array_column($variants, 'id');
            foreach ($variants as $variant) {
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
            $staleShopifyVariants = DB::table('variants_cache')
                ->where('product_cache_id', $cacheId)
                ->where('variant_gid', 'not like', 'local://%');
            if (!empty($shopifyVariantGids)) {
                $staleShopifyVariants->whereNotIn('variant_gid', $shopifyVariantGids);
            }
            $staleShopifyVariants->delete();
            $synced++;
        }

        $nextCursor = $connection['pageInfo']['hasNextPage'] ? $connection['pageInfo']['endCursor'] : null;

        if ($nextCursor === null && $jobId) {
            DB::table('bulk_jobs')->where('id', $jobId)->update(['status' => 'Completed', 'records_affected' => DB::raw("records_affected + $synced"), 'progress' => 100, 'completed_at' => now()]);
        } else if ($jobId) {
            DB::table('bulk_jobs')->where('id', $jobId)->update(['records_affected' => DB::raw("records_affected + $synced")]);
        }

        return response()->json(['message' => 'Catalog chunk synced', 'synced' => $synced, 'next_cursor' => $nextCursor, 'jobId' => $jobId, 'completed_at' => now()->toIso8601String()]);
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
            \Log::info('Taxonomy Roots Response:', $response->getDecodedBody());
            $body = $response->getDecodedBody();
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

    Route::post('/sync/push', function (Request $request) {
        $session = clone $request->get('shopifySession');
        $shop = $session->getShop();
        $token = $session->getAccessToken();
        $offset = (int) $request->input('offset', 0);
        $limit = 5; // process 5 at a time to be safe from rate limits
        
        $client = new \Shopify\Clients\Graphql($shop, $token);
        $formatGraphqlErrors = function (array $errors): string {
            return implode('; ', array_map(function ($error) {
                $field = !empty($error['field']) ? implode('.', (array) $error['field']) . ': ' : '';
                return $field . ($error['message'] ?? json_encode($error));
            }, $errors));
        };
        $runQuery = function (string $query, array $variables, string $label) use ($client, $formatGraphqlErrors): array {
            $body = $client->query(['query' => $query, 'variables' => $variables])->getDecodedBody();
            if (!empty($body['errors'])) {
                throw new \RuntimeException($label . ': ' . $formatGraphqlErrors($body['errors']));
            }
            if (empty($body['data'])) {
                throw new \RuntimeException($label . ': Shopify returned no data.');
            }
            return $body['data'];
        };
        $runMutation = function (string $query, array $variables, string $payloadKey, string $label) use ($runQuery, $formatGraphqlErrors): array {
            $data = $runQuery($query, $variables, $label);
            $payload = $data[$payloadKey] ?? null;
            if (!is_array($payload)) {
                throw new \RuntimeException($label . ': Shopify returned no mutation payload.');
            }
            foreach (['userErrors', 'mediaUserErrors', 'mediaErrors'] as $errorKey) {
                if (!empty($payload[$errorKey])) {
                    throw new \RuntimeException($label . ': ' . $formatGraphqlErrors($payload[$errorKey]));
                }
            }
            foreach ($payload['media'] ?? [] as $media) {
                if (!empty($media['mediaErrors'])) {
                    throw new \RuntimeException($label . ': ' . $formatGraphqlErrors($media['mediaErrors']));
                }
            }
            return $payload;
        };
        $resolveProductCategory = function (string $storedCategory) use ($runQuery): ?string {
            if (preg_match('/^gid:\/\/shopify\/TaxonomyCategory\/[A-Za-z0-9._-]+$/', $storedCategory)) {
                return $storedCategory;
            }
            $data = $runQuery(
                'query ProductTaxonomyCategoryByName($search: String!) { taxonomy { categories(first: 50, search: $search) { edges { node { id fullName isLeaf } } } } }',
                ['search' => $storedCategory],
                'Shopify product category lookup failed'
            );
            $matches = array_values(array_filter(
                array_map(fn($edge) => $edge['node'] ?? [], $data['taxonomy']['categories']['edges'] ?? []),
                fn($node) => !empty($node['isLeaf']) && ($node['fullName'] ?? '') === $storedCategory
            ));
            return count($matches) === 1 ? ($matches[0]['id'] ?? null) : null;
        };
        $fetchProductSyncState = function (string $productId) use ($runQuery): ?array {
            $productQuery = <<<'GRAPHQL'
query ProductSyncState($id: ID!, $variantCursor: String, $mediaCursor: String) {
  product(id: $id) {
    id
    options { id name optionValues { id name } }
    variants(first: 250, after: $variantCursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title sku selectedOptions { name value }
        inventoryItem {
          id
          inventoryLevels(first: 250) {
            nodes {
              location { id }
              quantities(names: ["available"]) { name quantity }
            }
          }
        }
      }
    }
    media(first: 250, after: $mediaCursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id mediaContentType status mediaErrors { message }
        ... on MediaImage { image { url } }
      }
    }
  }
}
GRAPHQL;
            $variantCursor = null;
            $mediaCursor = null;
            $product = null;
            do {
                $data = $runQuery($productQuery, [
                    'id' => $productId,
                    'variantCursor' => $variantCursor,
                    'mediaCursor' => $mediaCursor,
                ], 'Shopify product lookup failed');
                $pageProduct = $data['product'] ?? null;
                if (!$pageProduct) {
                    return null;
                }
                if ($product === null) {
                    $product = $pageProduct;
                    $product['variants']['nodes'] = [];
                    $product['media']['nodes'] = [];
                }
                    if ($variantCursor !== null || empty($product['variants']['nodes'])) {
                        $product['variants']['nodes'] = array_merge(
                            $product['variants']['nodes'],
                            $pageProduct['variants']['nodes'] ?? []
                        );
                    }
                    if ($mediaCursor !== null || empty($product['media']['nodes'])) {
                        $product['media']['nodes'] = array_merge(
                            $product['media']['nodes'],
                            $pageProduct['media']['nodes'] ?? []
                        );
                    }
                $variantPageInfo = $pageProduct['variants']['pageInfo'] ?? [];
                $mediaPageInfo = $pageProduct['media']['pageInfo'] ?? [];
                $variantCursor = !empty($variantPageInfo['hasNextPage']) ? ($variantPageInfo['endCursor'] ?? null) : null;
                $mediaCursor = !empty($mediaPageInfo['hasNextPage']) ? ($mediaPageInfo['endCursor'] ?? null) : null;
                if ((!empty($variantPageInfo['hasNextPage']) && !$variantCursor) ||
                    (!empty($mediaPageInfo['hasNextPage']) && !$mediaCursor)) {
                    throw new \RuntimeException('Shopify product lookup returned an incomplete pagination cursor.');
                }
            } while ($variantCursor !== null || $mediaCursor !== null);

            return $product;
        };
        $syncMode = $request->input('syncMode');
        $selectedProductIds = $request->input('selectedProductIds');
        if ($selectedProductIds !== null && !is_array($selectedProductIds)) {
            return response()->json(['message' => 'Selected product IDs must be an array.'], 422);
        }
        if (is_array($selectedProductIds)) {
            $selectedProductIds = array_values(array_unique(array_filter(array_map(function ($id) {
                return is_scalar($id) && ctype_digit((string) $id) ? (int) $id : null;
            }, $selectedProductIds), fn($id) => $id !== null && $id > 0)));
        }
        if ($syncMode === null && !$request->boolean('sync_files') && empty($selectedProductIds)) {
            return response()->json(['message' => 'Select at least one product to sync to Shopify.'], 422);
        }
        
        $jobId = $request->input('jobId');
        if (!$jobId && $offset === 0) {
            $jobType = 'Catalog Push';
            $jobName = 'Catalog Sync (Push)';
            if ($syncMode === 'seo') {
                $jobType = 'SEO Sync';
                $jobName = 'SEO Sync';
            } else if ($request->input('sync_files')) {
                $jobType = 'Image Sync';
                $jobName = 'Image Sync';
            }
            
            $jobId = DB::table('bulk_jobs')->insertGetId([
                'shop_domain' => $shop,
                'job_name' => $jobName,
                'job_type' => $jobType,
                'status' => 'Running',
                'records_affected' => 0,
                'progress' => 0,
                'started_at' => now(), 'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $query = DB::table('products_cache')->where('shop_domain', $shop)->orderBy('id');
        if (!empty($selectedProductIds)) {
            $query->whereIn('id', $selectedProductIds);
        }
        $products = $query->offset($offset)->limit($limit)->get();
            
        if ($products->isEmpty()) {
            if ($jobId) {
                DB::table('bulk_jobs')->where('id', $jobId)->update([
                    'status' => 'Completed',
                    'progress' => 100,
                    'completed_at' => now(),
                    'updated_at' => now()
                ]);
            }
            return response()->json(['more_remaining' => false, 'pushed_this_batch' => 0, 'jobId' => $jobId]);
        }
            
        $pushed = 0;
        $batchErrors = [];
        $toBoolean = function ($value): bool {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        };
        $makeVariantInput = function ($variant, bool $includeId, $product) use ($toBoolean, &$batchErrors): array {
            $input = [];
            if ($includeId) {
                $input['id'] = $variant->variant_gid;
            }
            if ($variant->price !== null && $variant->price !== '') {
                $input['price'] = $variant->price;
            }
            if ($variant->compare_at_price !== null && $variant->compare_at_price !== '') {
                $input['compareAtPrice'] = $variant->compare_at_price;
            }
            if ($variant->barcode !== null) {
                $input['barcode'] = $variant->barcode;
            }
            $weightMeasurement = null;
            if ($variant->weight !== null && $variant->weight !== '') {
                $weightUnits = [
                    'g' => 'GRAMS',
                    'kg' => 'KILOGRAMS',
                    'lb' => 'POUNDS',
                    'oz' => 'OUNCES',
                ];
                $unit = strtolower((string) ($variant->weight_unit ?? 'kg'));
                if (!isset($weightUnits[$unit])) {
                    $batchErrors[] = "{$product->title} variant {$variant->title}: Unsupported weight unit '{$unit}'.";
                } else {
                    $weightMeasurement = [
                        'weight' => [
                            'value' => (float) $variant->weight,
                            'unit' => $weightUnits[$unit],
                        ],
                    ];
                }
            }

            $inventoryItem = [];
            if ($weightMeasurement) {
                $inventoryItem['measurement'] = $weightMeasurement;
            }
            if ($variant->sku !== null) {
                $inventoryItem['sku'] = $variant->sku;
            }
            if ($variant->cost_per_item !== null && $variant->cost_per_item !== '') {
                $inventoryItem['cost'] = $variant->cost_per_item;
            }
            if ($variant->origin !== null && $variant->origin !== '') {
                $inventoryItem['countryCodeOfOrigin'] = $variant->origin;
            }
            if ($variant->hs_code !== null && $variant->hs_code !== '') {
                $inventoryItem['harmonizedSystemCode'] = $variant->hs_code;
            }
            if ($variant->track_quantity !== null) {
                $inventoryItem['tracked'] = $toBoolean($variant->track_quantity);
            }
            if ($inventoryItem) {
                $input['inventoryItem'] = $inventoryItem;
            }
            if ($variant->continue_selling !== null) {
                $input['inventoryPolicy'] = $toBoolean($variant->continue_selling) ? 'CONTINUE' : 'DENY';
            }
            return $input;
        };
        $syncProductVariants = function ($product, string $productId, array $remoteState) use (
            $runMutation,
            $runQuery,
            $fetchProductSyncState,
            $makeVariantInput,
            $toBoolean,
            &$batchErrors
        ): array {
            $localVariants = DB::table('variants_cache')
                ->where('product_cache_id', $product->id)
                ->whereNull('superseded_by_variant_cache_id')
                ->orderBy('id')
                ->get();
            $remoteVariants = $remoteState['variants']['nodes'] ?? [];
            $remoteById = [];
            foreach ($remoteVariants as $remoteVariant) {
                $remoteById[$remoteVariant['id']] = $remoteVariant;
            }

            $remoteIds = array_keys($remoteById);
            $remoteIdOwners = $remoteIds
                ? DB::table('variants_cache')
                    ->whereIn('variant_gid', $remoteIds)
                    ->get(['id', 'variant_gid'])
                    ->keyBy('variant_gid')
                : collect();
            $claimedRemoteIds = [];
            foreach ($localVariants as $localVariant) {
                $remoteVariant = $remoteById[$localVariant->variant_gid] ?? null;
                $owner = $remoteIdOwners->get($localVariant->variant_gid);
                if (!$remoteVariant) {
                    continue;
                }
                if (($owner && (int) $owner->id !== (int) $localVariant->id) ||
                    isset($claimedRemoteIds[$remoteVariant['id']])) {
                    $batchErrors[] = "{$product->title} variant {$localVariant->title}: Shopify variant {$remoteVariant['id']} is already assigned to another local variant; it was not remapped.";
                    continue;
                }

                $claimedRemoteIds[$remoteVariant['id']] = (int) $localVariant->id;
                DB::table('variants_cache')->where('id', $localVariant->id)->where('product_cache_id', $product->id)->update([
                    'inventory_item_gid' => $remoteVariant['inventoryItem']['id'] ?? null,
                ]);
            }

            $blockedVariantIds = [];
            if (count($localVariants) === 2 && count($remoteVariants) === 1) {
                $mappedRows = $localVariants->filter(fn($variant) => isset($remoteById[$variant->variant_gid]))->values();
                $staleRows = $localVariants->filter(fn($variant) => !isset($remoteById[$variant->variant_gid]))->values();
                $remoteVariant = $remoteVariants[0];
                $potentialMerge = count($mappedRows) === 1 && count($staleRows) === 1
                    && $mappedRows[0]->variant_gid === $remoteVariant['id'];
                $mergeErrorCount = count($batchErrors);
                if ($potentialMerge) {
                    $blockedVariantIds[(int) $staleRows[0]->id] = true;
                }
                $remoteTitleOption = collect($remoteVariant['selectedOptions'] ?? [])->firstWhere('name', 'Title');
                $remotePriceIsZero = is_numeric($remoteVariant['price'] ?? null)
                    && (float) $remoteVariant['price'] === 0.0;
                $productHasDefaultTitleOption = count($remoteState['options'] ?? []) === 1
                    && ($remoteState['options'][0]['name'] ?? '') === 'Title';

                if ($potentialMerge &&
                    $productHasDefaultTitleOption &&
                    strcasecmp(trim((string) ($remoteVariant['title'] ?? '')), 'Default Title') === 0 &&
                    ($remoteTitleOption['value'] ?? null) === 'Default Title' &&
                    empty($remoteVariant['sku']) &&
                    $remotePriceIsZero) {
                    $canonical = $staleRows[0];
                    $mirror = $mappedRows[0];
                    $canonicalInventory = DB::table('inventory_cache')
                        ->where('variant_cache_id', $canonical->id)
                        ->get(['available']);
                    $mirrorInventory = DB::table('inventory_cache')
                        ->where('variant_cache_id', $mirror->id)
                        ->get(['available']);
                    $canonicalHasBusinessData = trim((string) $canonical->sku) !== ''
                        && is_numeric($canonical->price)
                        && (float) $canonical->price > 0
                        && $canonicalInventory->contains(fn($row) => (int) $row->available !== 0);
                    $mirrorHasOnlyDefaultData = trim((string) $mirror->title) === 'Default Title'
                        && ($mirror->sku === null || trim((string) $mirror->sku) === '')
                        && ($mirror->price === null || (float) $mirror->price === 0.0)
                        && $mirror->compare_at_price === null
                        && $mirror->barcode === null
                        && ($mirror->weight === null || (float) $mirror->weight === 0.0)
                        && $mirror->cost_per_item === null
                        && $mirror->hs_code === null
                        && $mirror->origin === null
                        && ! $mirrorInventory->contains(fn($row) => (int) $row->available !== 0);
                    $canonicalHasStaleShopifyId = preg_match(
                        '#^gid://shopify/ProductVariant/[0-9]+$#',
                        (string) $canonical->variant_gid
                    ) === 1;

                    if ($canonicalHasBusinessData && $mirrorHasOnlyDefaultData && $canonicalHasStaleShopifyId) {
                        $ownershipData = $runQuery(
                            'query VariantMappingOwnership($currentId: ID!, $staleId: ID!) { current: productVariant(id: $currentId) { id product { id } } stale: productVariant(id: $staleId) { id product { id } } }',
                            [
                                'currentId' => $remoteVariant['id'],
                                'staleId' => $canonical->variant_gid,
                            ],
                            "{$product->title} Shopify variant ownership check"
                        );
                        $currentOwnership = $ownershipData['current'] ?? null;
                        $staleOwnership = $ownershipData['stale'] ?? null;
                        if (($currentOwnership['id'] ?? null) !== $remoteVariant['id'] ||
                            ($currentOwnership['product']['id'] ?? null) !== $productId ||
                            $staleOwnership !== null) {
                            $batchErrors[] = "{$product->title}: Automatic variant merge skipped because Shopify ownership of the stale/current variant IDs could not be verified.";
                        } else {
                            $supersededVariantGid = $remoteVariant['id'];
                            $supersededInventoryItemGid = $remoteVariant['inventoryItem']['id'] ?? null;
                            $supersededRowGid = "local://superseded/variant/{$mirror->id}";
                            DB::transaction(function () use (
                                $product,
                                $canonical,
                                $mirror,
                                $remoteVariant,
                                $supersededRowGid,
                                $supersededVariantGid,
                                $supersededInventoryItemGid
                            ) {
                                $lockedRows = DB::table('variants_cache')
                                    ->whereIn('id', [$canonical->id, $mirror->id])
                                    ->orderBy('id')
                                    ->lockForUpdate()
                                    ->get()
                                    ->keyBy('id');
                                $lockedCanonical = $lockedRows->get($canonical->id);
                                $lockedMirror = $lockedRows->get($mirror->id);
                                if (!$lockedCanonical || !$lockedMirror ||
                                    (int) $lockedCanonical->product_cache_id !== (int) $product->id ||
                                    (int) $lockedMirror->product_cache_id !== (int) $product->id ||
                                    $lockedCanonical->superseded_by_variant_cache_id !== null ||
                                    $lockedMirror->superseded_by_variant_cache_id !== null ||
                                    $lockedCanonical->variant_gid !== $canonical->variant_gid ||
                                    $lockedMirror->variant_gid !== $remoteVariant['id'] ||
                                    trim((string) $lockedCanonical->sku) === '' ||
                                    !is_numeric($lockedCanonical->price) ||
                                    (float) $lockedCanonical->price <= 0 ||
                                    trim((string) $lockedMirror->title) !== 'Default Title' ||
                                    ($lockedMirror->sku !== null && trim((string) $lockedMirror->sku) !== '') ||
                                    ($lockedMirror->price !== null && (float) $lockedMirror->price !== 0.0) ||
                                    $lockedMirror->compare_at_price !== null ||
                                    $lockedMirror->barcode !== null ||
                                    ($lockedMirror->weight !== null && (float) $lockedMirror->weight !== 0.0) ||
                                    $lockedMirror->cost_per_item !== null ||
                                    $lockedMirror->hs_code !== null ||
                                    $lockedMirror->origin !== null ||
                                    ($lockedMirror->track_quantity !== null && filter_var($lockedMirror->track_quantity, FILTER_VALIDATE_BOOLEAN)) ||
                                    ($lockedMirror->continue_selling !== null && filter_var($lockedMirror->continue_selling, FILTER_VALIDATE_BOOLEAN))) {
                                    throw new \RuntimeException("{$product->title}: Variant rows changed; automatic merge was cancelled.");
                                }

                                $canonicalInventory = DB::table('inventory_cache')
                                    ->where('variant_cache_id', $canonical->id)
                                    ->lockForUpdate()
                                    ->get(['available']);
                                $mirrorInventory = DB::table('inventory_cache')
                                    ->where('variant_cache_id', $mirror->id)
                                    ->lockForUpdate()
                                    ->get(['available']);
                                if (!$canonicalInventory->contains(fn($row) => (int) $row->available !== 0) ||
                                    $mirrorInventory->contains(fn($row) => (int) $row->available !== 0)) {
                                    throw new \RuntimeException("{$product->title}: Inventory evidence changed; automatic merge was cancelled.");
                                }

                                $existingOwnerId = DB::table('variants_cache')
                                    ->where('variant_gid', $remoteVariant['id'])
                                    ->value('id');
                                if ((int) $existingOwnerId !== (int) $mirror->id ||
                                    DB::table('variants_cache')->where('variant_gid', $supersededRowGid)->exists()) {
                                    throw new \RuntimeException("{$product->title}: Shopify variant mapping is no longer unique; automatic merge was cancelled.");
                                }

                                $superseded = DB::table('variants_cache')
                                    ->where('id', $mirror->id)
                                    ->where('product_cache_id', $product->id)
                                    ->where('variant_gid', $remoteVariant['id'])
                                    ->whereNull('superseded_by_variant_cache_id')
                                    ->update([
                                        'variant_gid' => $supersededRowGid,
                                        'inventory_item_gid' => null,
                                        'superseded_by_variant_cache_id' => $canonical->id,
                                        'superseded_variant_gid' => $supersededVariantGid,
                                        'superseded_inventory_item_gid' => $supersededInventoryItemGid,
                                        'sync_pending' => false,
                                        'updated_at' => now(),
                                    ]);
                                if ($superseded !== 1) {
                                    throw new \RuntimeException("{$product->title}: Mirror row changed during merge; no variant mapping was transferred.");
                                }

                                try {
                                    $promoted = DB::table('variants_cache')
                                        ->where('id', $canonical->id)
                                        ->where('product_cache_id', $product->id)
                                        ->where('variant_gid', $canonical->variant_gid)
                                        ->whereNull('superseded_by_variant_cache_id')
                                        ->update([
                                            'variant_gid' => $remoteVariant['id'],
                                            'inventory_item_gid' => $remoteVariant['inventoryItem']['id'] ?? null,
                                            'sync_pending' => true,
                                            'updated_at' => now(),
                                        ]);
                                } catch (\Illuminate\Database\QueryException $exception) {
                                    $isDuplicateKey = ($exception->errorInfo[0] ?? null) === '23000'
                                        && (int) ($exception->errorInfo[1] ?? 0) === 1062;
                                    if (!$isDuplicateKey) {
                                        throw $exception;
                                    }
                                    throw new \RuntimeException("{$product->title}: Shopify variant mapping became occupied during merge; transaction rolled back.", 0, $exception);
                                }
                                if ($promoted !== 1) {
                                    throw new \RuntimeException("{$product->title}: Canonical row changed during merge; transaction rolled back.");
                                }
                            });

                            $claimedRemoteIds[$remoteVariant['id']] = (int) $canonical->id;
                            $remoteIdOwners->put($remoteVariant['id'], (object) ['id' => $canonical->id]);
                            $localVariants = DB::table('variants_cache')
                                ->where('product_cache_id', $product->id)
                                ->whereNull('superseded_by_variant_cache_id')
                                ->orderBy('id')
                                ->get();
                        }
                    }
                }
                if ($potentialMerge && count($batchErrors) === $mergeErrorCount &&
                    isset($blockedVariantIds[(int) $staleRows[0]->id])) {
                    $batchErrors[] = "{$product->title}: Stale and current variant rows did not meet the strong merge evidence requirements; no mapping or Shopify variant was changed.";
                }
            }

            $saveVariantMapping = function ($localVariant, array $remoteVariant) use (
                $product,
                &$remoteIdOwners,
                &$claimedRemoteIds,
                &$batchErrors
            ): bool {
                $remoteId = $remoteVariant['id'];
                $ownerId = DB::table('variants_cache')
                    ->where('variant_gid', $remoteId)
                    ->value('id');
                if ($ownerId !== null && (int) $ownerId !== (int) $localVariant->id) {
                    $batchErrors[] = "{$product->title} variant {$localVariant->title}: Shopify variant {$remoteId} is already assigned to local variant {$ownerId}; it was not remapped.";
                    return false;
                }
                if (isset($claimedRemoteIds[$remoteId]) &&
                    (int) $claimedRemoteIds[$remoteId] !== (int) $localVariant->id) {
                    $batchErrors[] = "{$product->title} variant {$localVariant->title}: Shopify variant {$remoteId} is already claimed by another local variant; it was not remapped.";
                    return false;
                }

                try {
                    $updated = DB::table('variants_cache')
                        ->where('id', $localVariant->id)
                        ->where('product_cache_id', $product->id)
                        ->where('variant_gid', $localVariant->variant_gid)
                        ->update([
                            'variant_gid' => $remoteId,
                            'inventory_item_gid' => $remoteVariant['inventoryItem']['id'] ?? null,
                        ]);
                } catch (\Illuminate\Database\QueryException $exception) {
                    $isDuplicateKey = ($exception->errorInfo[0] ?? null) === '23000'
                        && (int) ($exception->errorInfo[1] ?? 0) === 1062;
                    if (!$isDuplicateKey) {
                        throw $exception;
                    }
                    $batchErrors[] = "{$product->title} variant {$localVariant->title}: Shopify variant {$remoteId} became assigned to another local variant before its mapping could be saved.";
                    return false;
                }
                if ($updated !== 1) {
                    $batchErrors[] = "{$product->title} variant {$localVariant->title}: Its local mapping changed during reconciliation; Shopify variant {$remoteId} was not assigned.";
                    return false;
                }

                $claimedRemoteIds[$remoteId] = (int) $localVariant->id;
                $remoteIdOwners->put($remoteId, (object) ['id' => $localVariant->id]);
                return true;
            };

            foreach ($localVariants as $localVariant) {
                if (isset($claimedRemoteIds[$localVariant->variant_gid]) &&
                    (int) $claimedRemoteIds[$localVariant->variant_gid] === (int) $localVariant->id) {
                    continue;
                }

                $availableRemoteVariants = array_values(array_filter($remoteVariants, function ($candidate) use (
                    $claimedRemoteIds,
                    $remoteIdOwners,
                    $localVariant
                ) {
                    $owner = $remoteIdOwners->get($candidate['id']);
                    return !isset($claimedRemoteIds[$candidate['id']])
                        && (!$owner || (int) $owner->id === (int) $localVariant->id);
                }));
                $matches = [];
                if ($localVariant->sku !== null && trim((string) $localVariant->sku) !== '') {
                    $matches = array_values(array_filter($availableRemoteVariants, fn($candidate) =>
                        ($candidate['sku'] ?? null) === $localVariant->sku
                    ));
                }

                if (count($matches) !== 1) {
                    $localTitle = trim((string) $localVariant->title);
                    if ($localTitle !== '' && strcasecmp($localTitle, 'Default Title') !== 0) {
                        $matches = array_values(array_filter($availableRemoteVariants, fn($candidate) =>
                            trim((string) ($candidate['title'] ?? '')) === $localTitle
                            && strcasecmp(trim((string) ($candidate['title'] ?? '')), 'Default Title') !== 0
                        ));
                    } else {
                        $matches = [];
                    }
                }

                if (count($matches) === 1) {
                    $saveVariantMapping($localVariant, $matches[0]);
                }
            }

            $localVariants = DB::table('variants_cache')
                ->where('product_cache_id', $product->id)
                ->whereNull('superseded_by_variant_cache_id')
                ->orderBy('id')
                ->get();
            $unmappedVariants = $localVariants->filter(function ($variant) use ($remoteById) {
                return empty($remoteById[$variant->variant_gid] ?? null);
            })->values();
            $createInputs = [];
            $createLocalByKey = [];
            $preCreateRemoteIds = array_fill_keys(array_keys($remoteById), true);
            $productOptions = $remoteState['options'] ?? [];
            $isDefaultTitleOption = count($productOptions) === 1 && ($productOptions[0]['name'] ?? '') === 'Title';

            foreach ($unmappedVariants as $variant) {
                if (isset($blockedVariantIds[(int) $variant->id])) {
                    continue;
                }
                if (!$isDefaultTitleOption) {
                    $batchErrors[] = "{$product->title} variant {$variant->title}: Shopify variant options cannot be created because option names and values are not stored in the local cache.";
                    continue;
                }
                $value = trim((string) $variant->title);
                if ($value === '' || strcasecmp($value, 'Default Title') === 0) {
                    $batchErrors[] = "{$product->title} variant {$variant->title}: Cannot safely identify or create a distinct Shopify variant from the cached Default Title.";
                    continue;
                }
                $optionKey = strtolower($value);
                if (isset($createLocalByKey[$optionKey])) {
                    $batchErrors[] = "{$product->title} variant {$variant->title}: Duplicate cached variant title cannot map to a unique Shopify variant.";
                    continue;
                }
                $createInput = $makeVariantInput($variant, false, $product);
                unset($createInput['id']);
                $createInput['optionValues'] = [[
                    'optionName' => 'Title',
                    'name' => $value,
                ]];
                $createInputs[] = $createInput;
                $createLocalByKey[$optionKey] = $variant->id;
            }

            if ($createInputs) {
                try {
                    $runMutation(
                        'mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: PRESERVE_STANDALONE_VARIANT) { productVariants { id title selectedOptions { name value } inventoryItem { id } } userErrors { field message } } }',
                        ['productId' => $productId, 'variants' => $createInputs],
                        'productVariantsBulkCreate',
                        "{$product->title} variant creation"
                    );
                } catch (\Throwable $exception) {
                    $batchErrors[] = $exception->getMessage();
                }

                $remoteState = $fetchProductSyncState($productId);
                if ($remoteState === null) {
                    throw new \RuntimeException("{$product->title}: Shopify variants could not be verified after variant creation.");
                }
                $remoteVariants = $remoteState['variants']['nodes'] ?? [];
                $remoteById = [];
                foreach ($remoteVariants as $remoteVariant) {
                    $remoteById[$remoteVariant['id']] = $remoteVariant;
                }
                foreach ($remoteVariants as $remoteVariant) {
                    if (isset($preCreateRemoteIds[$remoteVariant['id']])) {
                        continue;
                    }
                    $title = trim((string) (collect($remoteVariant['selectedOptions'] ?? [])->firstWhere('name', 'Title')['value'] ?? ''));
                    $localId = $createLocalByKey[strtolower($title)] ?? null;
                    if (!$localId) {
                        continue;
                    }
                    $localVariant = $localVariants->firstWhere('id', $localId);
                    if ($localVariant) {
                        $saveVariantMapping($localVariant, $remoteVariant);
                    }
                }
            }

            $localVariants = DB::table('variants_cache')
                ->where('product_cache_id', $product->id)
                ->whereNull('superseded_by_variant_cache_id')
                ->orderBy('id')
                ->get();
            $remoteVariantIds = array_keys($remoteById);
            $updates = [];
            $mappedVariants = [];
            $claimedRemoteIds = [];
            foreach ($localVariants as $variant) {
                $remoteVariant = $remoteById[$variant->variant_gid] ?? null;
                $mappedOwner = $remoteIdOwners->get($variant->variant_gid);
                if (!$remoteVariant ||
                    (isset($claimedRemoteIds[$remoteVariant['id']]) && (int) $claimedRemoteIds[$remoteVariant['id']] !== (int) $variant->id) ||
                    ($mappedOwner && (int) $mappedOwner->id !== (int) $variant->id)) {
                    $batchErrors[] = "{$product->title} variant {$variant->title}: No valid Shopify variant ID could be mapped; it was not sent.";
                    continue;
                }
                $claimedRemoteIds[$remoteVariant['id']] = (int) $variant->id;
                DB::table('variants_cache')->where('id', $variant->id)->where('product_cache_id', $product->id)->update([
                    'inventory_item_gid' => $remoteVariant['inventoryItem']['id'] ?? null,
                ]);
                $updates[] = $makeVariantInput($variant, true, $product);
                $mappedVariants[] = $variant;
            }

            if ($updates) {
                try {
                    $runMutation(
                        'mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }',
                        ['productId' => $productId, 'variants' => $updates],
                        'productVariantsBulkUpdate',
                        "{$product->title} variant update"
                    );
                } catch (\Throwable $exception) {
                    $batchErrors[] = $exception->getMessage();
                }
            }

            $quantityInputs = [];
            foreach ($mappedVariants as $variant) {
                $remoteVariant = $remoteById[$variant->variant_gid] ?? null;
                if (!$remoteVariant || empty($remoteVariant['inventoryItem']['id'])) {
                    continue;
                }
                $inventoryRows = DB::table('inventory_cache')->where('variant_cache_id', $variant->id)->get();
                if ($inventoryRows->isEmpty()) {
                    continue;
                }
                $tracked = $variant->track_quantity !== null
                    ? $toBoolean($variant->track_quantity)
                    : true;
                if (!$tracked) {
                    $batchErrors[] = "{$product->title} variant {$variant->title}: Cached inventory quantities were not sent because inventory tracking is disabled.";
                    continue;
                }

                $activeLocations = collect($remoteVariant['inventoryItem']['inventoryLevels']['nodes'] ?? [])
                    ->pluck('location.id')
                    ->all();
                foreach ($inventoryRows as $inventoryRow) {
                    if (!$inventoryRow->location_gid) {
                        $batchErrors[] = "{$product->title} variant {$variant->title}: Inventory row {$inventoryRow->id} has no Shopify location ID.";
                        continue;
                    }
                    $compareQuantity = null;
                    foreach ($remoteVariant['inventoryItem']['inventoryLevels']['nodes'] ?? [] as $inventoryLevel) {
                        if (($inventoryLevel['location']['id'] ?? null) === $inventoryRow->location_gid) {
                            $availableQuantity = collect($inventoryLevel['quantities'] ?? [])
                                ->firstWhere('name', 'available')['quantity'] ?? null;
                            if (is_numeric($availableQuantity)) {
                                $compareQuantity = (int) $availableQuantity;
                            }
                            break;
                        }
                    }
                    if (!in_array($inventoryRow->location_gid, $activeLocations, true)) {
                        try {
                            $runMutation(
                                'mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) { inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) { inventoryLevel { id } userErrors { field message } } }',
                                [
                                    'inventoryItemId' => $remoteVariant['inventoryItem']['id'],
                                    'locationId' => $inventoryRow->location_gid,
                                ],
                                'inventoryActivate',
                                "{$product->title} variant {$variant->title} inventory activation"
                            );
                        } catch (\Throwable $exception) {
                            $batchErrors[] = $exception->getMessage();
                            continue;
                        }
                        $compareQuantity = 0;
                    }
                    if ($compareQuantity === null) {
                        $batchErrors[] = "{$product->title} variant {$variant->title}: Shopify did not return the current available quantity for location {$inventoryRow->location_gid}; no quantity was sent.";
                        continue;
                    }
                    $quantityInputs[] = [
                        'inventoryItemId' => $remoteVariant['inventoryItem']['id'],
                        'locationId' => $inventoryRow->location_gid,
                        'quantity' => (int) $inventoryRow->available,
                        'compareQuantity' => $compareQuantity,
                    ];
                }
            }

            foreach (array_chunk($quantityInputs, 250) as $quantityChunk) {
                try {
                    $runMutation(
                        'mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }',
                        [
                            'input' => [
                                'name' => 'available',
                                'reason' => 'correction',
                                'quantities' => $quantityChunk,
                            ],
                        ],
                        'inventorySetQuantities',
                        "{$product->title} inventory quantity update"
                    );
                } catch (\Throwable $exception) {
                    $batchErrors[] = $exception->getMessage();
                }
            }

            return [$remoteState, $remoteVariantIds];
        };
        foreach ($products as $product) {
            $productErrorCount = count($batchErrors);
            try {
                $productId = $product->product_gid;
                $isLocal = !$productId || str_starts_with($productId, 'local://');
                $remoteState = (!$isLocal) ? $fetchProductSyncState($productId) : null;
                $exists = $remoteState !== null;
                
                if ($syncMode === 'seo') {
                    $productInput = [
                        'seo' => [
                            'title' => $product->meta_title ?? '',
                            'description' => $product->meta_description ?? ''
                        ]
                    ];
                } else {
                    $productInput = [
                        'title' => $product->title,
                        'vendor' => $product->vendor,
                        'tags' => json_decode($product->tags, true) ?? [],
                        'descriptionHtml' => $product->description ?? '',
                        'productType' => $product->product_type ?? '',
                        'templateSuffix' => in_array(strtolower((string) ($product->template ?? '')), ['', 'default product', 'product'], true)
                            ? null
                            : $product->template,
                        'seo' => [
                            'title' => $product->meta_title ?? '',
                            'description' => $product->meta_description ?? ''
                        ]
                    ];

                    $storedStatus = strtoupper((string) $product->status);
                    if (in_array($storedStatus, ['ACTIVE', 'DRAFT', 'ARCHIVED'], true)) {
                        $productInput['status'] = $storedStatus;
                    } else {
                        $batchErrors[] = "{$product->title} status: Unsupported cached status '{$product->status}'.";
                    }

                    $storedCategory = trim((string) ($product->product_category ?? ''));
                    if ($storedCategory !== '' && $storedCategory !== '—') {
                        $categoryId = $resolveProductCategory($storedCategory);
                        if ($categoryId) {
                            $productInput['category'] = $categoryId;
                        } else {
                            $batchErrors[] = "{$product->title} product category: Shopify could not resolve the cached category '{$storedCategory}' to a unique taxonomy category.";
                        }
                    }
                    
                    $syncHandle = $product->handle ?? '';
                    $syncHandle = preg_replace('#^products/#', '', $syncHandle);
                    $syncHandle = trim($syncHandle, '/');
                    if (!empty($syncHandle)) {
                        $productInput['handle'] = $syncHandle;
                    }
                }
                
                if ($exists) {
                    $productInput['id'] = $productId;
                    $updatePayload = $runMutation(
                        'mutation productUpdate($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id } userErrors { field message } } }',
                        ['product' => $productInput],
                        'productUpdate',
                        "{$product->title} product update"
                    );
                    if (empty($updatePayload['product']['id'])) {
                        throw new \RuntimeException("{$product->title}: Shopify did not return the updated product.");
                    }
                } else {
                    $createPayload = $runMutation(
                        'mutation productCreate($product: ProductCreateInput!) { productCreate(product: $product) { product { id } userErrors { field message } } }',
                        ['product' => $productInput],
                        'productCreate',
                        "{$product->title} product creation"
                    );
                    $productId = $createPayload['product']['id'] ?? null;
                    if (!$productId) {
                        throw new \RuntimeException("{$product->title}: Shopify did not return the created product.");
                    }
                    DB::table('products_cache')->where('id', $product->id)->where('shop_domain', $shop)->update([
                        'product_gid' => $productId,
                    ]);
                    $remoteState = $fetchProductSyncState($productId);
                }

                if (!$productId) {
                    throw new \RuntimeException("{$product->title}: Shopify product ID is missing after sync.");
                }

                if ($syncMode !== 'seo') {
                    if ($remoteState === null) {
                        throw new \RuntimeException("{$product->title}: Shopify product was created or updated but its variants could not be verified.");
                    }

                    [$remoteState, $remoteVariantGids] = $syncProductVariants($product, $productId, $remoteState);
                }
                
                if ($syncMode !== 'seo') {
                    $imagesData = $product->images_data !== null
                        ? json_decode($product->images_data, true)
                        : null;
                    $hasCompleteImageList = is_array($imagesData) && count($imagesData) < 10;
                    if (!is_array($imagesData)) {
                        $imagesData = $product->image_url
                            ? [['url' => $product->image_url, 'altText' => $product->image_alt ?? $product->title]]
                            : [];
                    }
                    $imagesData = array_values($imagesData);
                    $existingMedia = $remoteState['media']['nodes'] ?? [];
                    $existingMediaById = [];
                    $existingImageByUrl = [];
                    foreach ($existingMedia as $mediaNode) {
                        $existingMediaById[$mediaNode['id']] = $mediaNode;
                        if (($mediaNode['mediaContentType'] ?? '') === 'IMAGE' && !empty($mediaNode['image']['url'])) {
                            $existingImageByUrl[explode('?', $mediaNode['image']['url'])[0]] = $mediaNode['id'];
                        }
                    }

                    $desiredImageIds = [];
                    $pendingMedia = [];
                    foreach ($imagesData as $imageIndex => $image) {
                        if (!is_array($image) || empty($image['url'])) {
                            $batchErrors[] = "{$product->title} media item " . ($imageIndex + 1) . ': Cached image URL is missing.';
                            continue;
                        }
                        $mediaId = $image['id'] ?? null;
                        if ($mediaId && isset($existingMediaById[$mediaId]) && ($existingMediaById[$mediaId]['mediaContentType'] ?? '') === 'IMAGE') {
                            $desiredImageIds[$imageIndex] = $mediaId;
                            continue;
                        }
                        $mediaUrl = $image['url'];
                        $urlKey = explode('?', $mediaUrl)[0];
                        if (isset($existingImageByUrl[$urlKey])) {
                            $mediaId = $existingImageByUrl[$urlKey];
                            $desiredImageIds[$imageIndex] = $mediaId;
                            $imagesData[$imageIndex]['id'] = $mediaId;
                            continue;
                        }

                        $sourceUrl = $mediaUrl;
                        $parsedPath = parse_url($mediaUrl, PHP_URL_PATH) ?: $mediaUrl;
                        $uploadPosition = strpos($parsedPath, '/uploads/');
                        if ($uploadPosition !== false) {
                            $localPath = public_path('uploads/' . basename($parsedPath));
                            if (!file_exists($localPath)) {
                                throw new \RuntimeException("{$product->title} media item " . ($imageIndex + 1) . ": Local image file is missing.");
                            }
                            $filename = basename($localPath);
                            $mimeType = mime_content_type($localPath);
                            if (!$mimeType) {
                                throw new \RuntimeException("{$product->title} media item " . ($imageIndex + 1) . ": Could not determine local image type.");
                            }
                            $uploadPayload = $runMutation(
                                'mutation stagedUploadsCreate($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }',
                                [
                                    'input' => [[
                                        'filename' => $filename,
                                        'mimeType' => $mimeType,
                                        'httpMethod' => 'POST',
                                        'resource' => 'IMAGE',
                                    ]],
                                ],
                                'stagedUploadsCreate',
                                "{$product->title} media upload preparation"
                            );
                            $target = $uploadPayload['stagedTargets'][0] ?? null;
                            if (!$target || empty($target['url']) || empty($target['resourceUrl'])) {
                                throw new \RuntimeException("{$product->title} media item " . ($imageIndex + 1) . ': Shopify did not return a staged upload target.');
                            }
                            $postData = [];
                            foreach ($target['parameters'] ?? [] as $parameter) {
                                $postData[$parameter['name']] = $parameter['value'];
                            }
                            $fileContents = file_get_contents($localPath);
                            if ($fileContents === false) {
                                throw new \RuntimeException("{$product->title} media item " . ($imageIndex + 1) . ': Could not read the local image file.');
                            }
                            $uploadResponse = \Illuminate\Support\Facades\Http::attach(
                                'file',
                                $fileContents,
                                $filename,
                                ['Content-Type' => $mimeType]
                            )->post($target['url'], $postData);
                            if (!$uploadResponse->successful()) {
                                throw new \RuntimeException("{$product->title} media item " . ($imageIndex + 1) . ': Shopify rejected the staged image upload.');
                            }
                            $sourceUrl = $target['resourceUrl'];
                        }
                        $pendingMedia[] = [
                            'index' => $imageIndex,
                            'source' => $sourceUrl,
                            'alt' => $image['altText'] ?? $image['alt'] ?? $product->title,
                        ];
                    }

                    if ($pendingMedia) {
                        $runMutation(
                            'mutation ProductMediaUpdate($product: ProductUpdateInput!, $media: [CreateMediaInput!]) { productUpdate(product: $product, media: $media) { product { id } userErrors { field message } } }',
                            [
                                'product' => ['id' => $productId],
                                'media' => array_map(function ($item) {
                                    return [
                                        'alt' => $item['alt'],
                                        'mediaContentType' => 'IMAGE',
                                        'originalSource' => $item['source'],
                                    ];
                                }, $pendingMedia),
                            ],
                            'productUpdate',
                            "{$product->title} media creation"
                        );
                        $newMediaIds = [];
                        for ($attempt = 0; $attempt < 30; $attempt++) {
                            $remoteState = $fetchProductSyncState($productId);
                            if ($remoteState === null) {
                                throw new \RuntimeException("{$product->title}: Shopify media could not be verified after creation.");
                            }
                            $newMediaIds = array_values(array_filter(
                                array_column($remoteState['media']['nodes'] ?? [], 'id'),
                                fn($mediaId) => !isset($existingMediaById[$mediaId])
                            ));
                            if (count($newMediaIds) >= count($pendingMedia)) {
                                break;
                            }
                            usleep(500000);
                        }
                        if (count($newMediaIds) !== count($pendingMedia)) {
                            throw new \RuntimeException("{$product->title}: Shopify did not return an ID for every newly created image.");
                        }
                        $imagesReady = false;
                        for ($attempt = 0; $attempt < 30; $attempt++) {
                            $newImages = array_values(array_filter(
                                $remoteState['media']['nodes'] ?? [],
                                fn($mediaNode) => in_array($mediaNode['id'], $newMediaIds, true)
                            ));
                            $failedImage = collect($newImages)->firstWhere('status', 'FAILED');
                            if ($failedImage) {
                                $mediaErrors = $failedImage['mediaErrors'] ?? [];
                                $details = $mediaErrors
                                    ? $formatGraphqlErrors($mediaErrors)
                                    : 'Shopify failed to process the image.';
                                throw new \RuntimeException("{$product->title} media creation: {$details}");
                            }
                            $imagesReady = count($newImages) === count($pendingMedia) &&
                                collect($newImages)->every(fn($mediaNode) => ($mediaNode['status'] ?? '') === 'READY');
                            if ($imagesReady) {
                                break;
                            }
                            usleep(500000);
                            $remoteState = $fetchProductSyncState($productId);
                            if ($remoteState === null) {
                                throw new \RuntimeException("{$product->title}: Shopify media could not be verified after creation.");
                            }
                        }
                        if (!$imagesReady) {
                            throw new \RuntimeException("{$product->title}: Shopify image processing did not finish before the sync timed out.");
                        }
                        foreach ($pendingMedia as $index => $item) {
                            $mediaId = $newMediaIds[$index];
                            $desiredImageIds[$item['index']] = $mediaId;
                            $imagesData[$item['index']]['id'] = $mediaId;
                        }
                        $existingMedia = $remoteState['media']['nodes'] ?? [];
                        foreach ($existingMedia as $mediaNode) {
                            $existingMediaById[$mediaNode['id']] = $mediaNode;
                        }
                    }

                    $desiredImageIds = array_values(array_unique($desiredImageIds));
                    if ($hasCompleteImageList) {
                        $staleImageIds = [];
                        foreach ($existingMedia as $mediaNode) {
                            if (($mediaNode['mediaContentType'] ?? '') === 'IMAGE' &&
                                !in_array($mediaNode['id'], $desiredImageIds, true)) {
                                $staleImageIds[] = $mediaNode['id'];
                            }
                        }
                        if ($staleImageIds) {
                            $runMutation(
                                'mutation FileUpdateMediaReferences($files: [FileUpdateInput!]!) { fileUpdate(files: $files) { files { id } userErrors { field message } } }',
                                [
                                    'files' => array_map(fn($mediaId) => [
                                        'id' => $mediaId,
                                        'referencesToRemove' => [$productId],
                                    ], $staleImageIds),
                                ],
                                'fileUpdate',
                                "{$product->title} stale media removal"
                            );
                        }
                    }

                    $remoteState = $fetchProductSyncState($productId);
                    if ($remoteState === null) {
                        throw new \RuntimeException("{$product->title}: Shopify media could not be verified.");
                    }
                    $currentMedia = $remoteState['media']['nodes'] ?? [];
                    $currentMediaIds = array_column($currentMedia, 'id');
                    $orderedMediaIds = array_merge(
                        array_values(array_filter($desiredImageIds, fn($id) => in_array($id, $currentMediaIds, true))),
                        array_values(array_filter($currentMediaIds, fn($id) => !in_array($id, $desiredImageIds, true)))
                    );
                    $moves = [];
                    foreach ($orderedMediaIds as $position => $mediaId) {
                        if (($currentMediaIds[$position] ?? null) !== $mediaId) {
                            $moves[] = ['id' => $mediaId, 'newPosition' => (string) $position];
                        }
                    }
                    if ($moves) {
                        $reorderPayload = $runMutation(
                            'mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) { productReorderMedia(id: $id, moves: $moves) { job { id } mediaUserErrors { field message } } }',
                            ['id' => $productId, 'moves' => $moves],
                            'productReorderMedia',
                            "{$product->title} media reorder"
                        );
                        $jobGid = $reorderPayload['job']['id'] ?? null;
                        if (!$jobGid) {
                            throw new \RuntimeException("{$product->title}: Shopify did not return a media reorder job.");
                        }
                        $jobDone = false;
                        for ($attempt = 0; $attempt < 30; $attempt++) {
                            $jobData = $runQuery(
                                'query ProductMediaReorderJob($id: ID!) { job(id: $id) { id done } }',
                                ['id' => $jobGid],
                                "{$product->title} media reorder status"
                            );
                            $job = $jobData['job'] ?? null;
                            if (!$job) {
                                throw new \RuntimeException("{$product->title}: Shopify media reorder job could not be found.");
                            }
                            if (!empty($job['done'])) {
                                $jobDone = true;
                                break;
                            }
                            usleep(500000);
                        }
                        if (!$jobDone) {
                            throw new \RuntimeException("{$product->title}: Shopify media reorder did not finish before the sync timed out.");
                        }
                    }

                    DB::table('products_cache')->where('id', $product->id)->where('shop_domain', $shop)->update([
                        'images_data' => json_encode($imagesData),
                    ]);
                }

                $pushed++;
                if (count($batchErrors) === $productErrorCount) {
                    DB::table('products_cache')
                        ->where('id', $product->id)
                        ->where('shop_domain', $shop)
                        ->update(['sync_pending' => false]);
                }
                if ($syncMode !== 'seo' && !empty($remoteVariantGids)) {
                    DB::table('variants_cache')
                        ->where('product_cache_id', $product->id)
                        ->whereIn('variant_gid', $remoteVariantGids)
                        ->update(['sync_pending' => false]);
                }
                
            } catch (\Throwable $exception) {
                \Illuminate\Support\Facades\Log::error('Push sync error: ' . $exception->getMessage());
                $batchErrors[] = "{$product->title}: " . $exception->getMessage();
                $pushed++;
            }
        }
        
        $countQuery = DB::table('products_cache')->where('shop_domain', $shop);
        if (!empty($selectedProductIds)) {
            $countQuery->whereIn('id', $selectedProductIds);
        }
        $hasMore = $countQuery->count() > ($offset + $pushed);
        
        if ($jobId) {
            if ($hasMore) {
                DB::table('bulk_jobs')->where('id', $jobId)->update([
                    'records_affected' => DB::raw("records_affected + $pushed"),
                    'updated_at' => now()
                ]);
            } else {
                DB::table('bulk_jobs')->where('id', $jobId)->update([
                    'status' => 'Completed',
                    'records_affected' => DB::raw("records_affected + $pushed"),
                    'progress' => 100,
                    'completed_at' => now(),
                    'updated_at' => now()
                ]);
            }
        }
        
        \Illuminate\Support\Facades\Log::info("Push sync batch complete. Offset: $offset, Pushed: $pushed, HasMore: " . ($hasMore ? 'true' : 'false') . ", Total count: " . DB::table('products_cache')->where('shop_domain', $shop)->count());

        // If there are batch errors, append them to the job's error_message column so they appear in Sync Activity
        if (!empty($batchErrors) && $jobId) {
            $existingJob = DB::table('bulk_jobs')->where('id', $jobId)->first();
            $newErrorMsg = implode("\n", $batchErrors);
            if ($existingJob && $existingJob->error_message) {
                $newErrorMsg = $existingJob->error_message . "\n" . $newErrorMsg;
            }
            DB::table('bulk_jobs')->where('id', $jobId)->update([
                'error_message' => $newErrorMsg
            ]);
        }
        if (!$hasMore && $jobId) {
            $completedJob = DB::table('bulk_jobs')->where('id', $jobId)->first();
            if ($completedJob && !empty($completedJob->error_message)) {
                DB::table('bulk_jobs')->where('id', $jobId)->update(['status' => 'Failed']);
            }
        }

        return response()->json(['more_remaining' => $hasMore, 'pushed_this_batch' => $pushed, 'completed_at' => now()->toIso8601String(), 'jobId' => $jobId, 'errors' => $batchErrors]);
    });

    Route::get('/inventory', function (Request $request) {
        $rows = DB::table('inventory_cache')
            ->join('products_cache', 'products_cache.id', '=', 'inventory_cache.product_cache_id')
            ->leftJoin('variants_cache', 'variants_cache.id', '=', 'inventory_cache.variant_cache_id')
            ->where('products_cache.shop_domain', $request->get('shopifySession')->getShop())
            ->whereNull('variants_cache.superseded_by_variant_cache_id')
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

    Route::get('/notifications', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        $notifications = DB::table('notifications')
            ->where('shop_domain', $shop)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function ($notification) {
                $title = strtolower($notification->title);
                $message = strtolower($notification->message);
                $severity = str_contains($title, 'failed') || str_contains($title, 'error') || str_contains($message, 'failed')
                    ? 'error'
                    : (str_contains($title, 'warning') || str_contains($title, 'partial')
                        ? 'warning'
                        : (str_contains($title, 'completed') || str_contains($title, 'updated') || str_contains($title, 'created')
                            ? 'success'
                            : 'info'));

                return [
                    'id' => $notification->id,
                    'category' => $notification->category,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'severity' => $severity,
                    'created_at' => $notification->created_at,
                ];
            });

        return response()->json(['data' => $notifications]);
    });

    Route::post('/notifications', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        $data = $request->validate([
            'category' => ['required', 'string', 'max:80'],
            'title' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:1000'],
        ]);

        if (str_contains(strtolower($data['title']), 'started')) {
            return response()->json(['success' => true, 'stored' => false]);
        }

        $id = DB::table('notifications')->insertGetId([
            'shop_domain' => $shop,
            'category' => $data['category'],
            'title' => $data['title'],
            'message' => $data['message'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'stored' => true, 'id' => $id], 201);
    });

    Route::get('/notifications/read', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        return response()->json(Cache::get("read_notifications:$shop", []));
    });

    Route::post('/notifications/read', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        $data = $request->validate([
            'readIds' => ['required', 'array'],
            'readIds.*' => ['integer'],
        ]);
        Cache::forever("read_notifications:$shop", $data['readIds']);

        return response()->json(['success' => true]);
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

    Route::get('/exports', function (Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        $exports = DB::table('bulk_jobs')
            ->where('shop_domain', $shop)
            ->where('job_type', 'Export')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();
        return response()->json($exports);
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
                        $variants = DB::table('variants_cache')
                            ->where('product_cache_id', $product->id)
                            ->whereNull('superseded_by_variant_cache_id')
                            ->get();
                        if ($variants->isEmpty()) {
                            $inventory = DB::table('inventory_cache')
                                ->leftJoin('variants_cache', 'variants_cache.id', '=', 'inventory_cache.variant_cache_id')
                                ->where('inventory_cache.product_cache_id', $product->id)
                                ->whereNull('variants_cache.superseded_by_variant_cache_id')
                                ->sum('inventory_cache.available');
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
                        $inventory = DB::table('inventory_cache')
                            ->leftJoin('variants_cache', 'variants_cache.id', '=', 'inventory_cache.variant_cache_id')
                            ->where('inventory_cache.product_cache_id', $product->id)
                            ->whereNull('variants_cache.superseded_by_variant_cache_id')
                            ->sum('inventory_cache.available');
                        $activeVariants = DB::table('variants_cache')
                            ->where('product_cache_id', $product->id)
                            ->whereNull('superseded_by_variant_cache_id');
                        $price = (clone $activeVariants)->min('price');
                        $sku = $activeVariants->first()->sku ?? '';
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

        $recordsAffected = count($dataRows) - 1;
        DB::table('bulk_jobs')->insert([
            'shop_domain' => $shop,
            'job_name' => 'Products Export (' . strtoupper($format) . ')',
            'job_type' => 'Export',
            'status' => 'Completed',
            'records_affected' => $recordsAffected,
            'created_at' => now(),
            'updated_at' => now(),
            'started_at' => now(),
            'completed_at' => now(),
        ]);
        
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

    Route::get('/bulk-jobs', function (Request $request) {
        $session = $request->get('shopifySession');
        $query = DB::table('bulk_jobs')->where('shop_domain', $session->getShop());

        if ($request->has('search') && !empty($request->search)) {
            $query->where('job_name', 'LIKE', '%' . $request->search . '%');
        }
        if ($request->has('type') && !empty($request->type)) {
            $query->where('job_type', 'LIKE', '%' . $request->type . '%');
        }
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    });

    Route::post('/bulk-jobs/{id}/retry', function (Request $request, $id) {
        $session = $request->get('shopifySession');
        $job = DB::table('bulk_jobs')->where('shop_domain', $session->getShop())->where('id', $id)->first();
        if (!$job || $job->status !== 'Failed') {
            return response()->json(['error' => 'Job not retryable'], 400);
        }
        
        DB::table('bulk_jobs')->where('id', $id)->update([
            'status' => 'Queued',
            'error_message' => null,
            'progress' => 0,
            'updated_at' => now(),
        ]);
        
        return response()->json(['success' => true]);
    });

    Route::post('/bulk-jobs/{id}/cancel', function (Request $request, $id) {
        $session = $request->get('shopifySession');
        $job = DB::table('bulk_jobs')->where('shop_domain', $session->getShop())->where('id', $id)->first();
        if (!$job || !in_array($job->status, ['Queued', 'Running'])) {
            return response()->json(['error' => 'Job not cancellable'], 400);
        }
        
        DB::table('bulk_jobs')->where('id', $id)->update([
            'status' => 'Cancelled',
            'updated_at' => now(),
        ]);
        
        return response()->json(['success' => true]);
    });


    Route::get('/sync-activity', function (Request $request) {
        $session = $request->get('shopifySession');
        $query = DB::table('bulk_jobs')
            ->where('shop_domain', $session->getShop())
            ->whereIn('job_type', ['Catalog Sync', 'Catalog Push', 'Image Sync', 'SEO Sync']);

        if ($request->has('direction') && !empty($request->direction)) {
            $type = $request->direction === 'Sync from Shopify' ? 'Catalog Sync' : 'Catalog Push';
            $type = $request->direction === 'From Shopify' ? 'Catalog Sync' : 'Catalog Push';
            $query->where('job_type', $type);
        }
        if ($request->has('type') && !empty($request->type)) {
            $query->where('job_type', 'LIKE', '%' . $request->type . '%');
        }
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        $jobs = $query->orderBy('created_at', 'desc')->get()->map(function($job) {
            if ($job->job_type === 'Catalog Sync') {
                $job->direction = 'From Shopify';
            } else if ($job->job_type === 'Catalog Push' || $job->job_type === 'Image Sync' || $job->job_type === 'SEO Sync') {
                $job->direction = 'To Shopify';
            } else {
                $job->direction = 'Unknown';
            }
            return $job;
        });

        return response()->json($jobs);
    });

    Route::get('/locations', function (Request $request) {
        $session = $request->get('shopifySession');
        $shop = $session->getShop();
        $client = new Graphql($shop, $session->getAccessToken());

        try {
            $data = \Illuminate\Support\Facades\Cache::remember("locations_{$shop}", 3600, function () use ($client) {
                $response = $client->query([
                    'query' => '{ locations(first: 50) { nodes { id name } } }',
                ]);
                $body = $response->getDecodedBody();
                return $body['data']['locations']['nodes'] ?? [];
            });
            return response()->json($data);
        } catch (\Throwable $exception) {
            return response()->json(['error' => 'Failed to fetch locations'], 500);
        }
    });

    Route::get('/store-media', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());
        $search = $request->query('query');
        
        $queryStr = $search ? "filename:*$search*" : null;
        
        $query = <<<'GRAPHQL'
query GetStoreMedia($query: String) {
  files(first: 50, query: $query) {
    nodes {
      ... on MediaImage {
        id
        alt
        image { url }
      }
    }
  }
}
GRAPHQL;

        try {
            $response = $client->query([
                'query' => $query,
                'variables' => ['query' => $queryStr]
            ]);
            $body = $response->getDecodedBody();
            $nodes = $body['data']['files']['nodes'] ?? [];
            
            $media = [];
            foreach ($nodes as $node) {
                if (isset($node['image']['url'])) {
                    $media[] = [
                        'id' => $node['id'],
                        'url' => $node['image']['url'],
                        'alt' => $node['alt'] ?? ''
                    ];
                }
            }
            return response()->json(['data' => $media]);
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['error' => 'Failed to fetch store media'], 500);
        }
    });

    Route::get('/test-taxonomy', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());
        
        $query = <<<'GRAPHQL'
query {
  __type(name: "ProductTaxonomyNode") {
    name
    fields {
      name
    }
  }
}
GRAPHQL;

        $response = $client->query(['query' => $query]);
            \Log::info('Taxonomy Roots Response:', $response->getDecodedBody());
        return response()->json($response->getDecodedBody());
    });

    
    Route::get('/taxonomy', function (Request $request) {
        $session = $request->get('shopifySession');
        $client = new Graphql($session->getShop(), $session->getAccessToken());
        
        $search = $request->query('query');
        $parentId = $request->query('parentId');
        
        if ($search) {
            $query = <<<'GRAPHQL'
query GetTaxonomySearch($search: String!) {
  taxonomy {
    categories(first: 50, search: $search) {
      edges {
        node {
          id
          name
          fullName
          isLeaf
          isRoot
        }
      }
    }
  }
}
GRAPHQL;
            $variables = ['search' => $search];
            $response = $client->query(['query' => $query, 'variables' => $variables]);
        } else if ($parentId) {
            $query = <<<'GRAPHQL'
query GetTaxonomyChildren($id: ID!) {
  taxonomy {
    categories(first: 50, childrenOf: $id) {
      edges {
        node {
          id
          name
          fullName
          isLeaf
          isRoot
        }
      }
    }
  }
}
GRAPHQL;
            $variables = ['id' => $parentId];
            $response = $client->query(['query' => $query, 'variables' => $variables]);
        } else {
            // Fetch roots (top-level categories)
            // wait, we can't do `is_root:true` anymore. How to fetch roots?
            // "search" or "childrenOf" or what?
            // Let's just fetch without arguments, by default it might return roots? Or maybe we have to pass something.
            $query = <<<'GRAPHQL'
query GetTaxonomyRoots {
  taxonomy {
    categories(first: 100) {
      edges {
        node {
          id
          name
          fullName
          isLeaf
          isRoot
        }
      }
    }
  }
}
GRAPHQL;
            $response = $client->query(['query' => $query]);
            $body = $response->getDecodedBody();
            // Filter only roots if API returns all
            if (isset($body['data']['taxonomy']['categories']['edges'])) {
                $body['data']['taxonomy']['categories']['edges'] = array_values(array_filter(
                    $body['data']['taxonomy']['categories']['edges'],
                    function ($edge) { return $edge['node']['isRoot'] === true; }
                ));
            }
            return response()->json($body);
        }
        
        return response()->json($response->getDecodedBody());
    });

    Route::get('/shop-settings', function (Request $request) {
        $session = $request->get('shopifySession');
        $shop = $session->getShop();
        $client = new Graphql($shop, $session->getAccessToken());
        
        $data = \Illuminate\Support\Facades\Cache::remember("shop_settings_{$shop}", 3600, function () use ($client) {
            $query = <<<'GRAPHQL'
query {
  shop {
    currencyCode
    ianaTimezone
  }
}
GRAPHQL;
            $response = $client->query(['query' => $query]);
            $body = $response->getDecodedBody();
            return [
                'currencyCode' => $body['data']['shop']['currencyCode'] ?? 'USD',
                'ianaTimezone' => $body['data']['shop']['ianaTimezone'] ?? 'UTC',
            ];
        });
        return response()->json($data);
    });

    Route::get('/health', function (Illuminate\Http\Request $request) {
        $shop = $request->get('shopifySession')->getShop();
        $products = Illuminate\Support\Facades\DB::table('products_cache')->where('shop_domain', $shop)->get();
        $variants = Illuminate\Support\Facades\DB::table('variants_cache')
            ->whereIn('product_cache_id', $products->pluck('id'))
            ->whereNull('superseded_by_variant_cache_id')
            ->get();
        
        $missingImages = [];
        $incompleteDesc = [];
        $duplicateSkus = [];
        $missingCats = [];
        
        $skuCounts = [];
        foreach ($variants as $v) {
            if ($v->sku) {
                $skuCounts[$v->sku] = ($skuCounts[$v->sku] ?? 0) + 1;
            }
        }
        $duplicateSkuList = array_keys(array_filter($skuCounts, fn($c) => $c > 1));
        
        foreach ($products as $p) {
            $pVariants = $variants->where('product_cache_id', $p->id);
            $sku = $pVariants->first() ? $pVariants->first()->sku : '';
            
            if (!$p->image_url) {
                $missingImages[] = [
                    'id' => $p->id . '-img', 'title' => $p->title, 'sku' => $sku, 
                    'issue' => 'Missing product image', 'severity' => 'Critical', 'status' => 'Open'
                ];
            }
            if (!$p->meta_description || strlen($p->meta_description) < 40) {
                $incompleteDesc[] = [
                    'id' => $p->id . '-desc', 'title' => $p->title, 'sku' => $sku, 
                    'issue' => 'Description under 40 words', 'severity' => 'Warning', 'status' => 'Open'
                ];
            }
            
            $hasDup = false;
            foreach ($pVariants as $v) {
                if ($v->sku && in_array($v->sku, $duplicateSkuList)) {
                    $hasDup = true;
                    break;
                }
            }
            if ($hasDup) {
                $duplicateSkus[] = [
                    'id' => $p->id . '-sku', 'title' => $p->title, 'sku' => $sku, 
                    'issue' => 'Duplicate SKU detected', 'severity' => 'Warning', 'status' => 'In review'
                ];
            }
            
            if (!$p->collections || $p->collections === '[]') {
                $missingCats[] = [
                    'id' => $p->id . '-cat', 'title' => $p->title, 'sku' => $sku, 
                    'issue' => 'Not mapped to category', 'severity' => 'Info', 'status' => 'Open'
                ];
            }
        }
        
        $affectedProducts = array_merge($missingImages, $incompleteDesc, $duplicateSkus, $missingCats);
        $affectedProductIds = array_unique(array_map(function($a) { return explode('-', $a['id'])[0]; }, $affectedProducts));
        
        $totalProducts = $products->count();
        $totalProducts = $totalProducts > 0 ? $totalProducts : 1;
        
        $imgScore = ($totalProducts - count($missingImages)) / $totalProducts * 100;
        $descScore = ($totalProducts - count($incompleteDesc)) / $totalProducts * 100;
        $dupScore = ($totalProducts - count($duplicateSkus)) / $totalProducts * 100;
        $catScore = ($totalProducts - count($missingCats)) / $totalProducts * 100;
        $healthScore = round(($imgScore * 0.25) + ($descScore * 0.20) + ($dupScore * 0.15) + ($catScore * 0.15) + 15 + 10);
        
        return response()->json([
            'score' => $healthScore,
            'affectedCount' => count($affectedProductIds),
            'totalCount' => $totalProducts,
            'missingImagesCount' => count($missingImages),
            'incompleteDescCount' => count($incompleteDesc),
            'duplicateSkuCount' => count($duplicateSkus),
            'missingCatsCount' => count($missingCats),
            'affectedProducts' => $affectedProducts
        ]);
    });
});








Route::get('/debug/db', function() {
    return response()->json(Illuminate\Support\Facades\Schema::getColumnListing('variants_cache'));
});
