<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('variants_cache', function (Blueprint $table) {
            if (!Schema::hasColumn('variants_cache', 'compare_at_price')) $table->decimal('compare_at_price', 15, 2)->nullable();
            if (!Schema::hasColumn('variants_cache', 'barcode')) $table->string('barcode')->nullable();
            if (!Schema::hasColumn('variants_cache', 'weight')) $table->decimal('weight', 10, 3)->nullable();
            if (!Schema::hasColumn('variants_cache', 'weight_unit')) $table->string('weight_unit')->default('kg');
            if (!Schema::hasColumn('variants_cache', 'cost_per_item')) $table->decimal('cost_per_item', 15, 2)->nullable();
            if (!Schema::hasColumn('variants_cache', 'hs_code')) $table->string('hs_code')->nullable();
            if (!Schema::hasColumn('variants_cache', 'origin')) $table->string('origin')->nullable();
            if (!Schema::hasColumn('variants_cache', 'track_quantity')) $table->string('track_quantity')->nullable();
            if (!Schema::hasColumn('variants_cache', 'continue_selling')) $table->string('continue_selling')->nullable();
        });
    }

    public function down()
    {
        Schema::table('variants_cache', function (Blueprint $table) {
            $table->dropColumn(['compare_at_price', 'barcode', 'weight', 'weight_unit', 'cost_per_item', 'hs_code', 'origin', 'track_quantity', 'continue_selling']);
        });
    }
};
