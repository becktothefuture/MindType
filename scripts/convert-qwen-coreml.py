#!/usr/bin/env python3
"""
Convert Qwen 2.5-0.5B model to Core ML format for App Store distribution.

Usage:
    python scripts/convert-qwen-coreml.py --output ./models/qwen-coreml.mlpackage
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import coremltools as ct
    import torch
    from transformers import AutoModel, AutoTokenizer, AutoConfig
    import numpy as np
except ImportError as e:
    print(f"Error: Required packages not installed. Install with:")
    print("pip install coremltools torch transformers numpy")
    print(f"Missing: {e}")
    sys.exit(1)

def convert_qwen_to_coreml(output_path: str, quantize: bool = True):
    """Convert Qwen model from HuggingFace to Core ML format."""
    
    print("🔄 Converting Qwen 2.5-0.5B to Core ML format...")
    
    model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    
    try:
        # Load model and tokenizer
        print("📥 Loading model from HuggingFace...")
        config = AutoConfig.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name, torch_dtype=torch.float32)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Set model to evaluation mode
        model.eval()
        
        # Define input shape (batch_size=1, sequence_length=512)
        max_seq_length = 512
        input_shape = (1, max_seq_length)
        
        print(f"📐 Input shape: {input_shape}")
        print(f"🔧 Model config: {config.hidden_size} hidden, {config.num_attention_heads} heads")
        
        # Create example input
        example_input = torch.randint(0, config.vocab_size, input_shape, dtype=torch.int32)
        
        # Trace the model
        print("🔍 Tracing model...")
        with torch.no_grad():
            traced_model = torch.jit.trace(model, example_input)
        
        # Convert to Core ML
        print("⚙️  Converting to Core ML...")
        
        # Define compute units (prefer Neural Engine)
        compute_units = ct.ComputeUnit.ALL
        if quantize:
            compute_units = ct.ComputeUnit.CPU_AND_NE  # Neural Engine for quantized
        
        coreml_model = ct.convert(
            traced_model,
            inputs=[
                ct.TensorType(
                    name="input_ids",
                    shape=input_shape,
                    dtype=np.int32
                )
            ],
            outputs=[
                ct.TensorType(
                    name="last_hidden_state",
                    dtype=np.float16 if quantize else np.float32
                )
            ],
            compute_units=compute_units,
            minimum_deployment_target=ct.target.macOS14,
            convert_to="mlprogram"  # Use ML Program format
        )
        
        # Apply quantization if requested
        if quantize:
            print("🗜️  Applying quantization...")
            coreml_model = ct.optimize.coreml.linear_quantize_weights(
                coreml_model,
                mode="linear_symmetric",
                dtype=np.int8
            )
        
        # Add metadata
        coreml_model.short_description = "Qwen 2.5-0.5B Instruct model for text correction"
        coreml_model.author = "Mind⠶Flow"
        coreml_model.license = "Apache 2.0"
        coreml_model.version = "1.0"
        
        # Save model
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"💾 Saving to: {output_file}")
        coreml_model.save(str(output_file))
        
        # Verify and report
        print("✅ Conversion completed successfully!")
        
        # Get file size
        if output_file.exists():
            # For .mlpackage, calculate directory size
            if output_file.is_dir():
                total_size = sum(f.stat().st_size for f in output_file.rglob('*') if f.is_file())
            else:
                total_size = output_file.stat().st_size
            
            size_mb = total_size / (1024 * 1024)
            print(f"📊 Model size: {size_mb:.1f} MB")
            print(f"🔧 Quantization: {'Enabled (int8)' if quantize else 'Disabled (float32)'}")
            print(f"⚡ Compute units: {compute_units}")
        
        # Test basic inference
        print("🧪 Testing basic inference...")
        test_input = {"input_ids": np.random.randint(0, 1000, input_shape, dtype=np.int32)}
        
        try:
            prediction = coreml_model.predict(test_input)
            output_shape = prediction["last_hidden_state"].shape
            print(f"✅ Inference test passed. Output shape: {output_shape}")
        except Exception as e:
            print(f"⚠️  Inference test failed: {e}")
            
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Convert Qwen model to Core ML format")
    parser.add_argument(
        "--output", 
        default="./models/qwen-coreml.mlpackage",
        help="Output path for Core ML model (default: ./models/qwen-coreml.mlpackage)"
    )
    parser.add_argument(
        "--no-quantize",
        action="store_true",
        help="Disable quantization (larger model, potentially better quality)"
    )
    
    args = parser.parse_args()
    
    print("🧠 Qwen → Core ML Conversion Tool")
    print("=" * 45)
    
    convert_qwen_to_coreml(
        output_path=args.output,
        quantize=not args.no_quantize
    )
    
    print("\n🎯 Next steps:")
    print("1. Copy model to Xcode project resources")
    print("2. Update Swift code to load Core ML model")
    print("3. Test with Core ML Performance Tool")
    print("4. Validate Neural Engine utilization")

if __name__ == "__main__":
    main()


