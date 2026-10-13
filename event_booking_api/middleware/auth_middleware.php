<?php

// =====================================================
// JWT AUTHENTICATION & ROLE MIDDLEWARE
// =====================================================

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header(
    "Access-Control-Allow-Headers: Content-Type, Authorization"
);
header(
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
);


// =====================================================
// REQUIRED FILES
// =====================================================

require_once __DIR__ . "/../config/jwt_config.php";
require_once __DIR__ . "/../vendor/autoload.php";

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;


// =====================================================
// HANDLE PREFLIGHT REQUEST
// =====================================================

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}


// =====================================================
// GET REQUEST HEADERS
// =====================================================

function getAuthHeaders()
{
    $headers = function_exists("getallheaders")
        ? getallheaders()
        : [];

    return array_change_key_case(
        $headers,
        CASE_LOWER
    );
}


// =====================================================
// SEND AUTH ERROR
// =====================================================

function authError($statusCode, $message)
{
    http_response_code($statusCode);

    echo json_encode([
        "success" => false,
        "message" => $message
    ]);

    exit;
}


// =====================================================
// REQUIRE JWT AUTHENTICATION
// =====================================================

function requireAuth()
{
    $headers = getAuthHeaders();

    // ---------------------------------------------
    // Get Authorization header
    // ---------------------------------------------
    $authorization =
        $headers["authorization"] ?? null;


    if (empty($authorization)) {
        authError(
            401,
            "Authentication required"
        );
    }


    // ---------------------------------------------
    // Expected format:
    // Authorization: Bearer <JWT>
    // ---------------------------------------------
    if (
        !preg_match(
            '/^Bearer\s+(.+)$/i',
            trim($authorization),
            $matches
        )
    ) {
        authError(
            401,
            "Invalid Authorization header"
        );
    }


    $token = trim($matches[1]);


    if ($token === "") {
        authError(
            401,
            "JWT token is required"
        );
    }


    try {

        // -----------------------------------------
        // Verify signature + algorithm + expiration
        // -----------------------------------------
        $decoded = JWT::decode(
            $token,
            new Key(
                JWT_SECRET_KEY,
                JWT_ALGORITHM
            )
        );


        // -----------------------------------------
        // Validate required JWT claims
        // -----------------------------------------
        if (
            !isset($decoded->user_id) ||
            !isset($decoded->role)
        ) {
            authError(
                401,
                "Invalid token payload"
            );
        }


        $userId = (int)$decoded->user_id;
        $userRole = strtolower(
            (string)$decoded->role
        );


        if ($userId <= 0) {
            authError(
                401,
                "Invalid user in token"
            );
        }


        $allowedRoles = [
            "admin",
            "organiser",
            "customer"
        ];


        if (
            !in_array(
                $userRole,
                $allowedRoles,
                true
            )
        ) {
            authError(
                403,
                "Invalid user role"
            );
        }


        // -----------------------------------------
        // Authenticated user comes from JWT
        // -----------------------------------------
        return [
            "user_id" => $userId,
            "role" => $userRole,

            "name" =>
                isset($decoded->name)
                    ? (string)$decoded->name
                    : null,

            "email" =>
                isset($decoded->email)
                    ? (string)$decoded->email
                    : null
        ];


    } catch (ExpiredException $e) {

        authError(
            401,
            "Token has expired"
        );


    } catch (SignatureInvalidException $e) {

        authError(
            401,
            "Invalid token signature"
        );


    } catch (Throwable $e) {

        authError(
            401,
            "Invalid authentication token"
        );
    }
}


// =====================================================
// REQUIRE SPECIFIC ROLE
// =====================================================

function requireRole($allowedRoles)
{
    $user = requireAuth();


    if (!is_array($allowedRoles)) {
        $allowedRoles = [$allowedRoles];
    }


    $allowedRoles = array_map(
        "strtolower",
        $allowedRoles
    );


    if (
        !in_array(
            $user["role"],
            $allowedRoles,
            true
        )
    ) {
        authError(
            403,
            "Access denied for this role"
        );
    }


    return $user;
}
?>