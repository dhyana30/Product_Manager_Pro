<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Shopify\Clients\Graphql;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/debug-publications', function () {
    $shop = 'demo1-demo.myshopify.com';
    $session = DB::table('sessions')->where('shop', $shop)->first();
    $client = new Graphql($shop, $session->access_token);

    $graphqlQuery = <<<GRAPHQL
    query {
        products(first: 1) {
            nodes {
                id
                title
                resourcePublications(first: 10) {
                    nodes {
                        publication {
                            name
                        }
                    }
                }
            }
        }
    }
GRAPHQL;

    $response = $client->query(['query' => $graphqlQuery]);
    return response()->json($response->getDecodedBody());
});
