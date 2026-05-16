<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $primaryKey = 'report_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'report_id',
        'telegram_chat_id',
        'crop_type',
        'detected_disease',
        'prescribed_chemical',
        'farmer_feedback',
        'status',
        'latitude',
        'longitude',
        'region',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
