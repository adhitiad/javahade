import requests
import logging

logger = logging.getLogger(__name__)

class CryptoVerificationService:
    @staticmethod
    def verify_usdt_trc20(txid, target_address="TR3Kwp47fUGHLN18X1qvZW7BeWSxGCbxsH"):
        """
        Verify a USDT TRC20 transaction on Tron network via TronScan public API.
        """
        url = f"https://apilist.tronscan.org/api/transaction-info?hash={txid}"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                return {"valid": False, "error": f"API Error: {response.status_code}"}
            
            data = response.json()
            if not data or data == {}:
                return {"valid": False, "error": "Transaksi tidak ditemukan di TronScan."}
            
            if data.get("contractRet") != "SUCCESS":
                return {"valid": False, "error": "Transaksi gagal (Failed/Reverted)."}

            # Check TRC20 transfers
            transfers = data.get("trc20TransferInfo", [])
            found_transfer = None
            for t in transfers:
                # Compare case-insensitive just in case, though base58 is case-sensitive
                if t.get("to_address") == target_address and t.get("symbol") == "USDT":
                    found_transfer = t
                    break
            
            if not found_transfer:
                return {"valid": False, "error": f"Tidak ditemukan transfer USDT ke alamat {target_address}."}
            
            decimals = int(found_transfer.get("decimals", 6))
            amount_str = found_transfer.get("amount_str", "0")
            amount = float(amount_str) / (10 ** decimals)
            
            return {
                "valid": True,
                "amount": amount,
                "currency": "USDT",
                "from_address": found_transfer.get("from_address")
            }

        except Exception as e:
            logger.error(f"TRC20 Verification error: {e}")
            return {"valid": False, "error": "Terjadi kesalahan internal saat mengecek blockchain."}

    @staticmethod
    def verify_bnb_bep20(txid, target_address="0x83d1c5f8aea8d7fc15ca91e60c2368ba7f3bfc0e"):
        """
        Verify a native BNB transaction on Binance Smart Chain via public RPC.
        Assumes it is a direct BNB transfer (not a token transfer).
        """
        url = "https://bsc-dataseed.binance.org/"
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getTransactionByHash",
            "params": [txid],
            "id": 1
        }
        try:
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code != 200:
                return {"valid": False, "error": f"RPC Error: {response.status_code}"}
            
            data = response.json()
            result = data.get("result")
            
            if not result:
                return {"valid": False, "error": "Transaksi tidak ditemukan di BSC."}
            
            # Check receiver
            to_addr = result.get("to", "")
            if not to_addr or to_addr.lower() != target_address.lower():
                # Jika `input` bukan "0x", bisa jadi ini token transfer contract call (misal kirim USDT bep20)
                input_data = result.get("input", "0x")
                if input_data != "0x":
                    return {"valid": False, "error": "Transaksi memanggil Smart Contract (mungkin Token). Harap verifikasi manual."}
                return {"valid": False, "error": f"Alamat penerima salah ({to_addr}). Harus ke dompet Host."}
            
            # Value in wei (hex string)
            value_hex = result.get("value", "0x0")
            value_wei = int(value_hex, 16)
            amount = value_wei / (10 ** 18)
            
            # Check transaction receipt for confirmation status
            receipt_payload = {
                "jsonrpc": "2.0",
                "method": "eth_getTransactionReceipt",
                "params": [txid],
                "id": 2
            }
            receipt_res = requests.post(url, json=receipt_payload, timeout=10)
            receipt_data = receipt_res.json().get("result")
            
            if not receipt_data:
                return {"valid": False, "error": "Transaksi masih pending (Mempool)."}
            
            status_hex = receipt_data.get("status", "0x0")
            if status_hex == "0x0":
                return {"valid": False, "error": "Transaksi gagal (Reverted)."}

            return {
                "valid": True,
                "amount": amount,
                "currency": "BNB",
                "from_address": result.get("from")
            }

        except Exception as e:
            logger.error(f"BEP20 Verification error: {e}")
            return {"valid": False, "error": "Terjadi kesalahan internal saat mengecek BSC RPC."}
