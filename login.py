import MetaTrader5 as mt5

# Initialize MT5
if not mt5.initialize():
    print("MT5 initialize failed")
    quit()

# Login (optional if already logged in terminal)
account = 100564040
password = "7m_uNdPt"
server = "MetaQuotes-Demo"

if not mt5.login(account, password, server):
    print("Login failed")
    quit()

print("MT5 connected successfully")
