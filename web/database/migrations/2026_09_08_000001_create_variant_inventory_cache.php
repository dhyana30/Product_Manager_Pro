<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('variants_cache')) {
            Schema::create('variants_cache', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_cache_id')->constrained('products_cache')->cascadeOnDelete();
                $table->string('variant_gid')->unique();
                $table->string('inventory_item_gid')->nullable();
                $table->string('title')->nullable();
                $table->string('sku')->nullable();
                $table->decimal('price', 15, 2)->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('inventory_cache', 'variant_cache_id')) {
            Schema::table('inventory_cache', function (Blueprint $table) {
                $table->foreignId('variant_cache_id')->nullable()->after('product_cache_id');
            });
        }

        if (!Schema::hasColumn('inventory_cache', 'location_name')) {
            Schema::table('inventory_cache', function (Blueprint $table) {
                $table->string('location_name')->nullable()->after('location_gid');
            });
        }

        Schema::table('inventory_cache', function (Blueprint $table) {
            $table->index('product_cache_id');
            $table->dropUnique(['product_cache_id', 'location_gid']);
            $table->foreign('variant_cache_id')->references('id')->on('variants_cache')->cascadeOnDelete();
            $table->unique(['variant_cache_id', 'location_gid']);
        });
    }

    public function down()
    {
        Schema::table('inventory_cache', function (Blueprint $table) {
            $table->dropForeign(['variant_cache_id']);
            $table->dropColumn(['variant_cache_id', 'location_name']);
        });
        Schema::dropIfExists('variants_cache');
    }
};
