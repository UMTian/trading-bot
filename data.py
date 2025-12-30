import pandas as pd
import MetaTrader5 as mt5

symbol = "EURUSD"
timeframe = mt5.TIMEFRAME_M15
volume = 0.1  # Lot size for the trade

# Initialize MT5 connection
if not mt5.initialize():
    print("Failed to initialize MT5 connection.")
    exit()

# Check if the symbol is available
if not mt5.symbol_select(symbol, True):
    print(f"Failed to select symbol {symbol}. Please ensure it is available in Market Watch.")
    mt5.shutdown()
    exit()

# Fetch rates
data = mt5.copy_rates_from_pos(symbol, timeframe, 0, 100)

# Debugging: Check if data is None or empty
if data is None or len(data) == 0:
    print("No data fetched. Please check the symbol, timeframe, or connection.")
    mt5.shutdown()
    exit()

# Debugging: Inspect the structure of the data
print("Fetched data:", data[:5])  # Print the first 5 rows for inspection

# Create DataFrame
df = pd.DataFrame(data)

# Check if 'time' column exists
if 'time' not in df.columns:
    print("'time' column not found in the data.")
    print("Columns available:", df.columns)
    mt5.shutdown()
    exit()

# Convert 'time' column to datetime
df['time'] = pd.to_datetime(df['time'], unit='s')

# Print the DataFrame
print(df.tail())

# Debugging: Check symbol info
symbol_info = mt5.symbol_info(symbol)
if symbol_info is None:
    print(f"Symbol {symbol} not found.")
    mt5.shutdown()
    exit()

# Check if trading is allowed based on trade_mode
if symbol_info.trade_mode != mt5.SYMBOL_TRADE_MODE_FULL:
    print(f"Trading is not fully allowed for symbol {symbol}. Trade mode: {symbol_info.trade_mode}")
    mt5.shutdown()
    exit()

if symbol_info.volume_min > volume or symbol_info.volume_max < volume:
    print(f"Volume {volume} is out of range for symbol {symbol}. Min: {symbol_info.volume_min}, Max: {symbol_info.volume_max}")
    mt5.shutdown()
    exit()

# Debugging: Check account info
account_info = mt5.account_info()
if account_info is None:
    print("Failed to retrieve account info.")
    mt5.shutdown()
    exit()

if account_info.balance < 100:
    print("Insufficient balance to execute the trade.")
    mt5.shutdown()
    exit()

# Force FOK filling mode
filling_mode = mt5.ORDER_FILLING_FOK

# Get the minimum stop level (in points) required by the broker
symbol_info = mt5.symbol_info(symbol)
if symbol_info is None:
    print(f"Symbol {symbol} not found.")
    mt5.shutdown()
    exit()

min_stop_distance = symbol_info.trade_stops_level * symbol_info.point

# Place a buy order
trade_request = {
    "action": mt5.TRADE_ACTION_DEAL,
    "symbol": symbol,
    "volume": volume,
    "type": mt5.ORDER_TYPE_BUY,
    "price": mt5.symbol_info_tick(symbol).ask,
    "sl": 0.0,  # No stop loss
    "tp": 0.0,  # No take profit
    "deviation": 10,
    "magic": 123456,  # Unique identifier for the order
    "comment": "Buy order from script",
    "type_time": mt5.ORDER_TIME_GTC,  # Good till canceled
    "type_filling": filling_mode,
}

# Send the trade request
result = mt5.order_send(trade_request)

# Check the result
if result.retcode != mt5.TRADE_RETCODE_DONE:
    print(f"Trade failed with retcode: {result.retcode}")
    print("Trade result details:", result)
else:
    print(f"Trade successful! Order ID: {result.order}")

# Shutdown MT5 connection
mt5.shutdown()
