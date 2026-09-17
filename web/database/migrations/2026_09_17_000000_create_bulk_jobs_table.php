<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bulk_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('shop_domain')->nullable();
            $table->string('job_name');
            $table->string('job_type');
            $table->string('status')->default('Queued');
            $table->integer('records_affected')->default(0);
            $table->integer('total_records')->nullable();
            $table->integer('progress')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('bulk_jobs');
    }
};
