// Package middleware provides shared HTTP middleware.
package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const UsernameKey contextKey = "username"
const RoleKey contextKey = "role"

// JWTAuth validates JWT tokens from the Authorization header.
// Shares the same secret key as Django SimpleJWT.
func JWTAuth(secretKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"detail":"Authorization header required"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, `{"detail":"Invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secretKey), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"detail":"Invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"detail":"Invalid token claims"}`, http.StatusUnauthorized)
				return
			}

			// SimpleJWT uses "user_id" claim
			userID, ok := claims["user_id"].(string)
			if !ok {
				http.Error(w, `{"detail":"Missing user_id in token"}`, http.StatusUnauthorized)
				return
			}

			// Check token type (SimpleJWT uses "token_type": "access")
			tokenType, _ := claims["token_type"].(string)
			if tokenType != "access" {
				http.Error(w, `{"detail":"Invalid token type"}`, http.StatusUnauthorized)
				return
			}
			
			// Validate Device Fingerprint
			tokenFp, _ := claims["device_fingerprint"].(string)
			if tokenFp != "" {
				ip := r.Header.Get("X-Forwarded-For")
				if ip == "" {
					ip = strings.Split(r.RemoteAddr, ":")[0]
				}
				userAgent := r.UserAgent()
				rawFp := fmt.Sprintf("%v-%s-%s", userID, userAgent, ip)
				hash := sha256.Sum256([]byte(rawFp))
				computedFp := hex.EncodeToString(hash[:])
				
				// Optional: strict check
				if tokenFp != computedFp {
					http.Error(w, `{"detail":"Device fingerprint mismatch"}`, http.StatusUnauthorized)
					return
				}
			}

			// Extract Role
			role, _ := claims["role"].(string)

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, RoleKey, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole checks if the user has the required role.
// Must be used after JWTAuth.
func RequireRole(requiredRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := r.Context().Value(RoleKey).(string)
			if !ok || role != requiredRole {
				http.Error(w, `{"detail":"Forbidden: Insufficient role"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// OptionalJWTAuth extracts user info if token present, but doesn't require it.
func OptionalJWTAuth(secretKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				next.ServeHTTP(w, r)
				return
			}

			token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
				return []byte(secretKey), nil
			})

			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if userID, ok := claims["user_id"].(string); ok {
						ctx := context.WithValue(r.Context(), UserIDKey, userID)
						r = r.WithContext(ctx)
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUserID extracts the user ID from the request context.
func GetUserID(ctx context.Context) string {
	if v, ok := ctx.Value(UserIDKey).(string); ok {
		return v
	}
	return ""
}

