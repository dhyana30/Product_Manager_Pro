<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('products_cache', function (Blueprint $table) {
            $table->id();
            $table->string('shop_domain');
            $table->string('product_gid');
            $table->string('title');
            $table->string('handle')->nullable();
            $table->string('vendor')->nullable();
            $table->string('status')->default('active');
            $table->json('tags')->nullable();
            $table->string('image_url')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->timestamps();
            $table->unique(['shop_domain', 'product_gid']);
            $table->index(['shop_domain', 'status']);
        });

        Schema::create('inventory_cache', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_cache_id')->constrained('products_cache')->cascadeOnDelete();
            $table->string('location_gid');
            $table->integer('available')->default(0);
            $table->integer('committed')->default(0);
            $table->integer('incoming')->default(0);
            $table->timestamps();
            $table->unique(['product_cache_id', 'location_gid']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('shop_domain');
            $table->string('category');
            $table->string('title');
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['shop_domain', 'read_at']);
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('shop_domain');
            $table->string('key_name');
            $table->json('payload');
            $table->timestamps();
            $table->unique(['shop_domain', 'key_name']);
        });

        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('shop_domain');
            $table->string('name');
            $table->string('trigger_type');
            $table->string('action_type');
            $table->json('conditions')->nullable();
            $table->json('action_payload')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();
            $table->index(['shop_domain', 'enabled']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('automation_rules');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('inventory_cache');
        Schema::dropIfExists('products_cache');
    }
};
