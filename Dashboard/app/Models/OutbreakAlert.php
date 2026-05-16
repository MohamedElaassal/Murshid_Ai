<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutbreakAlert extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'detected_disease',
        'region',
        'crop_type',
        'centroid_latitude',
        'centroid_longitude',
        'radius_km',
        'report_count',
        'density_percent',
        'severity',
        'message',
        'report_ids',
        'status',
        'read_at',
    ];

    protected $casts = [
        'centroid_latitude' => 'float',
        'centroid_longitude' => 'float',
        'radius_km' => 'float',
        'density_percent' => 'float',
        'report_ids' => 'array',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function isUnread(): bool
    {
        return $this->read_at === null;
    }
}
