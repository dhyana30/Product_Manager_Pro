<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $table->boolean('sync_pending')->default(false)->after('updated_at');
        });
        
        Schema::table('variants_cache', function (Blueprint $table) {
            $table->boolean('sync_pending')->default(false)->after('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $table->dropColumn('sync_pending');
        });
        
        Schema::table('variants_cache', function (Blueprint $table) {
            $table->dropColumn('sync_pending');
        });
    }
};
