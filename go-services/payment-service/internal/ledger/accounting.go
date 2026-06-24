package ledger

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Ledger struct {
	db *pgxpool.Pool
}

func NewLedger(db *pgxpool.Pool) *Ledger {
	return &Ledger{db: db}
}

// RecordTransaction handles the double-entry accounting for a successful payment.
// It also simulates a rolling reserve by locking 10% of the funds.
func (l *Ledger) RecordTransaction(ctx context.Context, userID string, amount int64, currency string, providerRef string) error {
	tx, err := l.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Get or Create Wallet
	var walletID string
	err = tx.QueryRow(ctx, `
		INSERT INTO wallets (user_id, currency) 
		VALUES ($1, $2) 
		ON CONFLICT (user_id, currency) DO UPDATE SET updated_at = NOW() 
		RETURNING id
	`, userID, currency).Scan(&walletID)
	if err != nil {
		return fmt.Errorf("failed to get/create wallet: %w", err)
	}

	// 2. Create Transaction Record
	var transactionID string
	err = tx.QueryRow(ctx, `
		INSERT INTO transactions (wallet_id, provider, provider_ref, amount, status, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, walletID, "system", providerRef, amount, "success", uuid.New().String()).Scan(&transactionID)
	if err != nil {
		return fmt.Errorf("failed to insert transaction: %w", err)
	}

	// 3. Calculate Reserve (10%)
	reserveAmount := amount / 10
	availableAmount := amount - reserveAmount

	// 4. Record Ledger Entries (Double Entry)
	// Debit Gateway/System Account, Credit User Wallet
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger_entries (transaction_id, account, debit, credit)
		VALUES 
			($1, 'system_gateway', $2, 0),
			($1, 'user_wallet_available', 0, $3),
			($1, 'user_wallet_reserve', 0, $4)
	`, transactionID, amount, availableAmount, reserveAmount)
	if err != nil {
		return fmt.Errorf("failed to insert ledger entries: %w", err)
	}

	// 5. Update Wallet Balances
	_, err = tx.Exec(ctx, `
		UPDATE wallets 
		SET balance = balance + $1,
		    locked_balance = locked_balance + $2
		WHERE id = $3
	`, availableAmount, reserveAmount, walletID)
	if err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}

	return tx.Commit(ctx)
}

// SpendTransaction deducts balance from a user's wallet and credits a system/creator account.
// It returns an error if the balance is insufficient.
func (l *Ledger) SpendTransaction(ctx context.Context, userID string, amount int64, currency string, reference string) error {
	tx, err := l.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Get Wallet and lock it for update
	var walletID string
	var currentBalance int64
	err = tx.QueryRow(ctx, `
		SELECT id, balance FROM wallets 
		WHERE user_id = $1 AND currency = $2 
		FOR UPDATE
	`, userID, currency).Scan(&walletID, &currentBalance)
	if err != nil {
		return fmt.Errorf("wallet not found or error: %w", err)
	}

	if currentBalance < amount {
		return fmt.Errorf("insufficient balance: current %d, required %d", currentBalance, amount)
	}

	// 2. Create Transaction Record
	var transactionID string
	err = tx.QueryRow(ctx, `
		INSERT INTO transactions (wallet_id, provider, provider_ref, amount, status, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, walletID, "internal_spend", reference, amount, "success", uuid.New().String()).Scan(&transactionID)
	if err != nil {
		return fmt.Errorf("failed to insert spend transaction: %w", err)
	}

	// 3. Record Ledger Entries
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger_entries (transaction_id, account, debit, credit)
		VALUES 
			($1, 'user_wallet_available', $2, 0),
			($1, 'system_creator_payable', 0, $3)
	`, transactionID, amount, amount)
	if err != nil {
		return fmt.Errorf("failed to insert ledger entries: %w", err)
	}

	// 4. Update Wallet Balance
	_, err = tx.Exec(ctx, `
		UPDATE wallets 
		SET balance = balance - $1,
		    updated_at = NOW()
		WHERE id = $2
	`, amount, walletID)
	if err != nil {
		return fmt.Errorf("failed to deduct wallet balance: %w", err)
	}

	return tx.Commit(ctx)
}

