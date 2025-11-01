#!/usr/bin/env python3
"""
Convert Qwen 2.5-0.5B model to MLX format for macOS app.

Usage:
    python scripts/convert-qwen-mlx.py --output ./models/qwen-mlx
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import mlx_lm
    from mlx_lm import convert
except ImportError:
    print("Error: mlx_lm not installed. Install with: pip install mlx-lm")
    sys.exit(1)

def convert_qwen_to_mlx(output_path: str, quantize: bool = True):
    """Convert Qwen model from HuggingFace to MLX format."""
    
    print("🔄 Converting Qwen 2.5-0.5B to MLX format...")
    
    # Ensure output directory exists
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Convert model using mlx_lm
        convert.convert(
            hf_path="Qwen/Qwen2.5-0.5B-Instruct",
            mlx_path=str(output_dir),
            quantize=quantize,
            q_group_size=64,
            q_bits=4,  # 4-bit quantization for smaller size
            dtype="float16"  # Use float16 for Apple Silicon efficiency
        )
        
        print(f"✅ Model converted successfully to: {output_dir}")
        print(f"📊 Quantization: {'Enabled (4-bit)' if quantize else 'Disabled'}")
        
        # Verify conversion
        model_files = list(output_dir.glob("*.safetensors"))
        config_files = list(output_dir.glob("*.json"))
        
        if model_files and config_files:
            print(f"📁 Model files: {len(model_files)} tensors, {len(config_files)} configs")
            
            # Calculate approximate size
            total_size = sum(f.stat().st_size for f in output_dir.iterdir())
            size_mb = total_size / (1024 * 1024)
            print(f"💾 Total size: {size_mb:.1f} MB")
            
        else:
            print("⚠️  Warning: Expected model files not found")
            
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Convert Qwen model to MLX format")
    parser.add_argument(
        "--output", 
        default="./models/qwen-mlx",
        help="Output directory for MLX model (default: ./models/qwen-mlx)"
    )
    parser.add_argument(
        "--no-quantize",
        action="store_true",
        help="Disable quantization (larger model, potentially better quality)"
    )
    
    args = parser.parse_args()
    
    print("🧠 Qwen → MLX Conversion Tool")
    print("=" * 40)
    
    convert_qwen_to_mlx(
        output_path=args.output,
        quantize=not args.no_quantize
    )
    
    print("\n🎯 Next steps:")
    print("1. Update macOS app to load from:", args.output)
    print("2. Test inference latency with: swift test")
    print("3. Verify model works in Testing Ground")

if __name__ == "__main__":
    main()


