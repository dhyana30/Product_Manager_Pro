<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $table->json('images_data')->nullable();
            $table->json('metafields')->nullable();
            $table->json('collections')->nullable();
        });
    }

    public function down()
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $table->dropColumn(['images_data', 'metafields', 'collections']);
        });
    }
};
