<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $table->string('image_name')->nullable()->after('image_url');
            $table->string('image_alt', 512)->nullable()->after('image_name');
        });
    }

    public function down()
    {
        Schema::table('products_cache', function (Blueprint $table) {
            $table->dropColumn(['image_name', 'image_alt']);
        });
    }
};
