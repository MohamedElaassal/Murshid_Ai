<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agronomist extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'region',
        'phone',
        'email',
        'active_tickets',
    ];
}
