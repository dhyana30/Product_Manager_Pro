<?php

namespace App\Http\Middleware;

use App\Exceptions\ShopifyBillingException;
use App\Lib\AuthRedirection;
use App\Lib\EnsureBilling;
use App\Lib\TopLevelRedirection;
use Closure;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Shopify\Context;
use Shopify\Utils;

class EnsureShopifySession
{
    public const ACCESS_MODE_ONLINE = 'online';
    public const ACCESS_MODE_OFFLINE = 'offline';

    public const TEST_GRAPHQL_QUERY = <<<QUERY
    {
        shop {
            name
        }
    }
    QUERY;

    /**
     * Checks if there is currently an active Shopify session.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $accessMode
     * @return mixed
     */
    public function handle(Request $request, Closure $next, string $accessMode = self::ACCESS_MODE_OFFLINE)
    {
        switch ($accessMode) {
            case self::ACCESS_MODE_ONLINE:
                $isOnline = true;
                break;
            case self::ACCESS_MODE_OFFLINE:
                $isOnline = false;
                break;
            default:
                throw new Exception(
                    "Unrecognized access mode '$accessMode', accepted values are 'online' and 'offline'"
                );
        }

        $shop = Utils::sanitizeShopDomain($request->query('shop', ''));
        try {
            $session = Utils::loadCurrentSession($request->header(), $request->cookie(), $isOnline);
        } catch (\Throwable $exception) {
            report($exception);

            if (!$shop && $request->bearerToken()) {
                $shop = $this->shopFromSessionToken($request->bearerToken());
            }

            $redirectQuery = $shop ? '?' . http_build_query(['shop' => $shop]) : '';

            return TopLevelRedirection::redirect($request, "/api/auth$redirectQuery");
        }

        if ($session && $shop && $session->getShop() !== $shop) {
            // This request is for a different shop. Go straight to login
            return AuthRedirection::redirect($request);
        }

        if ($session && $session->isValid()) {
            if (Config::get('shopify.billing.required')) {
                // The request to check billing status serves to validate that the access token is still valid.
                try {
                    list($hasPayment, $confirmationUrl) =
                        EnsureBilling::check($session, Config::get('shopify.billing'));
                    $proceed = true;

                    if (!$hasPayment) {
                        return TopLevelRedirection::redirect($request, $confirmationUrl);
                    }
                } catch (ShopifyBillingException $e) {
                    $proceed = false;
                }
            } else {
                // The Admin request itself validates the token. Avoid an extra network call here.
                $proceed = true;
            }

            if ($proceed) {
                $request->attributes->set('shopifySession', $session);
                return $next($request);
            }
        }

        $bearerPresent = preg_match("/Bearer (.*)/", $request->header('Authorization', ''), $bearerMatches);
        if (!$shop) {
            if ($session) {
                $shop = $session->getShop();
            } elseif (Context::$IS_EMBEDDED_APP) {
                if ($bearerPresent !== false) {
                    $payload = Utils::decodeSessionToken($bearerMatches[1]);
                    $shop = parse_url($payload['dest'], PHP_URL_HOST);
                }
            }
        }

        return TopLevelRedirection::redirect($request, "/api/auth?shop=$shop");
    }

    private function shopFromSessionToken(string $token): ?string
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        $destination = $payload['dest'] ?? null;

        return $destination ? Utils::sanitizeShopDomain((string) parse_url($destination, PHP_URL_HOST)) : null;
    }
}
