<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('variants_cache', function (Blueprint $table) {
            $table->foreignId('superseded_by_variant_cache_id')
                ->nullable()
                ->after('sync_pending')
                ->constrained('variants_cache')
                ->restrictOnDelete();
            $table->string('superseded_variant_gid')->nullable()->after('superseded_by_variant_cache_id');
            $table->string('superseded_inventory_item_gid')->nullable()->after('superseded_variant_gid');
        });
    }

    public function down()
    {
        Schema::table('variants_cache', function (Blueprint $table) {
            $table->dropForeign(['superseded_by_variant_cache_id']);
            $table->dropColumn([
                'superseded_by_variant_cache_id',
                'superseded_variant_gid',
                'superseded_inventory_item_gid',
            ]);
        });
    }
};
