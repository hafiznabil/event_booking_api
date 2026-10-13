<?php

// =====================================================
// HEADERS
// =====================================================
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// =====================================================
// REQUIRED FILES
// =====================================================
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../config/jwt_config.php";
require_once __DIR__ . "/../vendor/autoload.php";

use Firebase\JWT\JWT;


// =====================================================
// HANDLE OPTIONS REQUEST
// =====================================================
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}


// =====================================================
// DATABASE CONNECTION
// =====================================================
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);

    exit;
}


// =====================================================
// ONLY ALLOW POST
// =====================================================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed"
    ]);

    exit;
}


// =====================================================
// READ JSON BODY
// =====================================================
$data = json_decode(
    file_get_contents("php://input"),
    true
);

if (!is_array($data)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON body"
    ]);

    exit;
}


// =====================================================
// VALIDATE REQUIRED FIELDS
// =====================================================
if (
    empty($data["email"]) ||
    empty($data["password"])
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Email and password are required"
    ]);

    exit;
}


$email = trim($data["email"]);
$password = (string)$data["password"];


// =====================================================
// VALIDATE EMAIL FORMAT
// =====================================================
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid email format"
    ]);

    exit;
}


try {

    // =================================================
    // FIND USER BY EMAIL
    // =================================================
    $stmt = $db->prepare("
        SELECT
            user_id,
            name,
            email,
            password,
            role
        FROM users
        WHERE email = ?
        LIMIT 1
    ");

    $stmt->execute([$email]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);


    // =================================================
    // USER NOT FOUND
    // =================================================
    if (!$user) {
        http_response_code(401);

        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password"
        ]);

        exit;
    }


    // =================================================
    // PASSWORD VALIDATION
    // =================================================
    $passwordValid = false;
    $storedPassword = (string)$user["password"];
    $passwordInfo = password_get_info($storedPassword);


    // =================================================
    // PASSWORD ALREADY HASHED
    // =================================================
    if (!empty($passwordInfo["algo"])) {

        if (password_verify($password, $storedPassword)) {

            $passwordValid = true;

            // Rehash if required
            if (
                password_needs_rehash(
                    $storedPassword,
                    PASSWORD_DEFAULT
                )
            ) {

                $newHash = password_hash(
                    $password,
                    PASSWORD_DEFAULT
                );

                $update = $db->prepare("
                    UPDATE users
                    SET password = ?
                    WHERE user_id = ?
                ");

                $update->execute([
                    $newHash,
                    $user["user_id"]
                ]);
            }
        }

    } else {

        // =================================================
        // OLD PLAINTEXT PASSWORD
        // =================================================
        if (
            hash_equals(
                $storedPassword,
                $password
            )
        ) {

            $passwordValid = true;

            // Convert plaintext password to secure hash
            $newHash = password_hash(
                $password,
                PASSWORD_DEFAULT
            );

            $update = $db->prepare("
                UPDATE users
                SET password = ?
                WHERE user_id = ?
            ");

            $update->execute([
                $newHash,
                $user["user_id"]
            ]);
        }
    }


    // =================================================
    // WRONG PASSWORD
    // =================================================
    if (!$passwordValid) {
        http_response_code(401);

        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password"
        ]);

        exit;
    }


    // =================================================
    // GENERATE JWT
    // =================================================
    $issuedAt = time();
    $expiresAt = $issuedAt + JWT_EXPIRATION_TIME;

    $payload = [
        "iss" => "event_booking_api",
        "iat" => $issuedAt,
        "exp" => $expiresAt,

        "user_id" => (int)$user["user_id"],
        "name" => $user["name"],
        "email" => $user["email"],
        "role" => strtolower($user["role"])
    ];

    $jwt = JWT::encode(
        $payload,
        JWT_SECRET_KEY,
        JWT_ALGORITHM
    );


    // =================================================
    // REMOVE PASSWORD FROM RESPONSE
    // =================================================
    unset($user["password"]);

    $user["user_id"] = (int)$user["user_id"];
    $user["role"] = strtolower($user["role"]);


    // =================================================
    // LOGIN SUCCESS
    // =================================================
    http_response_code(200);

    echo json_encode([
        "success" => true,
        "message" => "Login successful",

        "token" => $jwt,
        "token_type" => "Bearer",
        "expires_in" => JWT_EXPIRATION_TIME,

        // Keep "data" so existing frontend remains compatible
        "data" => $user

    ], JSON_PRETTY_PRINT);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Login failed"
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Token generation failed"
    ]);
}
?>