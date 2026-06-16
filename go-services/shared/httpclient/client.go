package httpclient

import (
	"context"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/hashicorp/go-retryablehttp"
	"github.com/sony/gobreaker"
)

// CircuitBreakerClient membungkus HTTP client dengan Circuit Breaker dan Retry
type CircuitBreakerClient struct {
	client *retryablehttp.Client
	cb     *gobreaker.CircuitBreaker
}

// NewClient membuat HTTP client yang tahan banting (Resilient)
func NewClient(name string) *CircuitBreakerClient {
	// Konfigurasi Exponential Backoff Retry
	retryClient := retryablehttp.NewClient()
	retryClient.RetryMax = 3
	retryClient.RetryWaitMin = 1 * time.Second
	retryClient.RetryWaitMax = 5 * time.Second
	retryClient.Logger = nil // Disable default logger agar tidak spam log

	// Konfigurasi Circuit Breaker
	var st gobreaker.Settings
	st.Name = name
	st.MaxRequests = 5               // Maksimal request saat status half-open
	st.Interval = 10 * time.Second   // Reset hitungan error setelah 10 detik
	st.Timeout = 15 * time.Second    // Tunggu 15 detik sebelum beralih dari Open ke Half-Open
	st.ReadyToTrip = func(counts gobreaker.Counts) bool {
		// Trip (Buka sirkuit) jika ada lebih dari 5 request gagal beruntun
		return counts.ConsecutiveFailures > 5
	}

	cb := gobreaker.NewCircuitBreaker(st)

	return &CircuitBreakerClient{
		client: retryClient,
		cb:     cb,
	}
}

// Do mengeksekusi HTTP Request dengan perlindungan Circuit Breaker
func (c *CircuitBreakerClient) Do(req *retryablehttp.Request) (*http.Response, error) {
	result, err := c.cb.Execute(func() (interface{}, error) {
		resp, err := c.client.Do(req)
		if err != nil {
			return nil, err
		}
		// Anggap status >= 500 sebagai kegagalan server yang harus memicu breaker
		if resp.StatusCode >= http.StatusInternalServerError {
			// Pastikan body ditutup sebelum mengembalikan error
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			return nil, errors.New("server returned 5xx error: " + string(body))
		}
		return resp, nil
	})

	if err != nil {
		return nil, err
	}

	return result.(*http.Response), nil
}

// Get helper untuk HTTP GET
func (c *CircuitBreakerClient) Get(ctx context.Context, url string) (*http.Response, error) {
	req, err := retryablehttp.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	return c.Do(req)
}

// Post helper untuk HTTP POST
func (c *CircuitBreakerClient) Post(ctx context.Context, url, contentType string, body interface{}) (*http.Response, error) {
	req, err := retryablehttp.NewRequestWithContext(ctx, "POST", url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", contentType)
	return c.Do(req)
}

