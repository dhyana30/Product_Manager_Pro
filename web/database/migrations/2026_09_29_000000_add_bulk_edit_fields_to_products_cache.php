<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products_cache', function (Blueprint $table) {
            if (!Schema::hasColumn('products_cache', 'description')) {
                $table->text('description')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'product_type')) {
                $table->string('product_type')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'product_category')) {
                $table->string('product_category')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'template')) {
                $table->string('template')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'sales_channels')) {
                $table->text('sales_channels')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'online_store_scheduled')) {
                $table->string('online_store_scheduled')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'online_store_publish_date')) {
                $table->string('online_store_publish_date')->nullable();
            }
            if (!Schema::hasColumn('products_cache', 'testing')) {
                $table->string('testing')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $columns = [
                'description',
                'product_type',
                'product_category',
                'template',
                'sales_channels',
                'online_store_scheduled',
                'online_store_publish_date',
                'testing',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('products_cache', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
