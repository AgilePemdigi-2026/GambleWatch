#!/usr/bin/env python3
"""Build reference index for DET-02 Visual Similarity Detection."""

import json
import pickle
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

# Optional imports for visual features
try:
    import torch
    from PIL import Image
    from transformers import CLIPProcessor, CLIPModel
    VISUAL_AVAILABLE = True
except ImportError:
    VISUAL_AVAILABLE = False
    torch = None
    Image = None


class ReferenceIndexBuilder:
    """Build and manage reference index for visual similarity detection."""
    
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.model_name = model_name
        self.logger = logging.getLogger(__name__)
        
        self.model: Optional[CLIPModel] = None
        self.processor: Optional[CLIPProcessor] = None
        self.device = "cuda" if torch and torch.cuda.is_available() else "cpu"
        
        self.index: Dict[str, Any] = {
            'embeddings': [],
            'metadata': [],
            'model_name': model_name,
            'version': '1.0',
        }
    
    def initialize_model(self):
        """Initialize CLIP model if available."""
        if not VISUAL_AVAILABLE:
            self.logger.warning("CLIP dependencies not available. Install torch and transformers.")
            return False
        
        try:
            self.model = CLIPModel.from_pretrained(self.model_name)
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            
            self.logger.info(f"CLIP model loaded on {self.device}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load CLIP model: {e}")
            return False
    
    def build_from_directory(self, 
                            image_dir: str,
                            metadata_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Build index from directory of images.
        
        Args:
            image_dir: Directory containing reference images
            metadata_file: Optional JSON file with metadata for each image
        
        Returns:
            Dictionary containing the built index
        """
        if not self.initialize_model():
            return self.index
        
        image_dir = Path(image_dir)
        if not image_dir.exists():
            self.logger.error(f"Image directory not found: {image_dir}")
            return self.index
        
        # Load metadata if provided
        metadata = {}
        if metadata_file and Path(metadata_file).exists():
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                self.logger.info(f"Loaded metadata for {len(metadata)} images")
            except Exception as e:
                self.logger.error(f"Failed to load metadata: {e}")
        
        # Process images
        image_files = list(image_dir.glob("*.jpg")) + list(image_dir.glob("*.png"))
        image_files = image_files[:1000]  # Limit to 1000 images
        
        self.logger.info(f"Processing {len(image_files)} images...")
        
        embeddings = []
        metadata_list = []
        
        for idx, image_path in enumerate(image_files):
            try:
                # Load and preprocess image
                image = Image.open(image_path)
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Get embedding
                embedding = self._get_image_embedding(image)
                if embedding is not None:
                    embeddings.append(embedding)
                    
                    # Store metadata
                    img_metadata = metadata.get(image_path.name, {})
                    img_metadata.update({
                        'id': str(image_path.stem),
                        'filename': image_path.name,
                        'path': str(image_path),
                        'type': img_metadata.get('type', 'unknown'),
                        'category': img_metadata.get('category', 'unknown'),
                        'risk_level': img_metadata.get('risk_level', 'unknown'),
                    })
                    metadata_list.append(img_metadata)
                
                if (idx + 1) % 10 == 0:
                    self.logger.info(f"Processed {idx + 1}/{len(image_files)} images")
                    
            except Exception as e:
                self.logger.error(f"Failed to process {image_path.name}: {e}")
                continue
        
        # Convert to numpy arrays
        if embeddings:
            embeddings_np = np.array(embeddings)
            
            self.index = {
                'embeddings': embeddings_np,
                'metadata': metadata_list,
                'model_name': self.model_name,
                'version': '1.0',
                'total_images': len(embeddings),
                'embedding_dim': embeddings_np.shape[1],
            }
            
            self.logger.info(f"Built index with {len(embeddings)} images")
            self.logger.info(f"Embedding dimension: {embeddings_np.shape[1]}")
        
        return self.index
    
    def _get_image_embedding(self, image: Image.Image) -> Optional[np.ndarray]:
        """Get CLIP embedding for an image."""
        try:
            with torch.no_grad():
                inputs = self.processor(images=image, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                image_features = self.model.get_image_features(**inputs)
                embedding = image_features.cpu().numpy()[0]
                
                # Normalize
                embedding = embedding / np.linalg.norm(embedding)
                
                return embedding
                
        except Exception as e:
            self.logger.error(f"Failed to get embedding: {e}")
            return None
    
    def save_index(self, output_path: str):
        """Save index to file."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save as pickle for efficient loading
            with open(output_path, 'wb') as f:
                pickle.dump(self.index, f)
            
            # Also save metadata as JSON for inspection
            metadata_path = output_path.with_suffix('.metadata.json')
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'model_name': self.index.get('model_name'),
                    'version': self.index.get('version'),
                    'total_images': self.index.get('total_images', 0),
                    'embedding_dim': self.index.get('embedding_dim', 0),
                    'metadata_summary': [
                        {'id': m.get('id'), 'type': m.get('type'), 'category': m.get('category')}
                        for m in self.index.get('metadata', [])[:10]
                    ]
                }, f, indent=2)
            
            self.logger.info(f"Index saved to {output_path}")
            self.logger.info(f"Metadata summary saved to {metadata_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to save index: {e}")
    
    def load_index(self, index_path: str) -> bool:
        """Load index from file."""
        index_path = Path(index_path)
        
        if not index_path.exists():
            self.logger.error(f"Index file not found: {index_path}")
            return False
        
        try:
            with open(index_path, 'rb') as f:
                self.index = pickle.load(f)
            
            self.logger.info(f"Loaded index from {index_path}")
            self.logger.info(f"Contains {self.index.get('total_images', 0)} images")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load index: {e}")
            return False


def main():
    """Main function for command line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Build reference index for visual similarity')
    parser.add_argument('--image-dir', required=True, help='Directory containing reference images')
    parser.add_argument('--metadata', help='JSON file with image metadata')
    parser.add_argument('--output', default='data/reference_index.pkl', 
                       help='Output path for index file')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Configure logging
    level = logging.INFO if args.verbose else logging.WARNING
    logging.basicConfig(level=level, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Check if visual dependencies are available
    if not VISUAL_AVAILABLE:
        print("⚠️  CLIP dependencies not available. Install:")
        print("   pip install torch transformers")
        print("   (GPU recommended for better performance)")
        return
    
    # Build index
    builder = ReferenceIndexBuilder()
    
    print(f"Building reference index from {args.image_dir}")
    index = builder.build_from_directory(args.image_dir, args.metadata)
    
    if index.get('total_images', 0) > 0:
        builder.save_index(args.output)
        print(f"✅ Successfully built index with {index['total_images']} images")
    else:
        print("❌ Failed to build index. Check image directory and dependencies.")


if __name__ == "__main__":
    main()