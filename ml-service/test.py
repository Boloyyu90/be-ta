import sys
print(f"✅ Python version: {sys.version}")
print(f"✅ Python path: {sys.executable}")
print(f"✅ Virtual environment: {sys.prefix}")

# Test imports
try:
    import numpy as np
    import PIL
    print("✅ NumPy and PIL installed correctly")
except ImportError as e:
    print(f"❌ Missing package: {e}")