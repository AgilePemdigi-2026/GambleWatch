#!/usr/bin/env python3
"""Evaluation script for detection engine (SRS requirement)."""

import csv
import json
import time
import logging
from typing import List, Dict, Any, Tuple
from pathlib import Path
import pandas as pd
from sklearn.metrics import precision_recall_fscore_support, accuracy_score

from detection_engine import detect


class DetectionEvaluator:
    """Evaluate detection engine performance."""
    
    def __init__(self, detection_function=None):
        self.detection_function = detection_function or detect
        self.logger = logging.getLogger(__name__)
        
    def evaluate_csv(self, csv_path: str, output_path: str = None) -> Dict[str, Any]:
        """
        Evaluate from labeled CSV.
        
        Expected CSV format:
        url,is_gambling,category,notes
        https://example.com,1,casino,"Example gambling site"
        https://google.com,0,normal,"Safe site"
        """
        # Read CSV
        df = pd.read_csv(csv_path)
        
        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
        
        results = []
        y_true = []
        y_pred = []
        
        for idx, row in df.iterrows():
            try:
                # Prepare input
                input_data = {
                    "url": row['url'],
                    "scraped": {
                        "page_text": row.get('page_text', ''),
                        "title": row.get('title', ''),
                    }
                }
                
                # Run detection
                start_time = time.time()
                result = self.detection_function(input_data)
                duration = time.time() - start_time
                
                # Determine prediction
                is_gambling_pred = self._determine_prediction(result)
                
                # Store results
                results.append({
                    'url': row['url'],
                    'true_label': int(row['is_gambling']),
                    'pred_label': int(is_gambling_pred),
                    'score': result.get('summary', {}).get('overall_risk_score', 0),
                    'duration_ms': duration * 1000,
                    'detector_results': len(result.get('results', [])),
                })
                
                y_true.append(int(row['is_gambling']))
                y_pred.append(int(is_gambling_pred))
                
                self.logger.info(f"Processed {idx+1}/{len(df)}: {row['url']}")
                
            except Exception as e:
                self.logger.error(f"Error processing {row['url']}: {e}")
                continue
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_true, y_pred)
        
        # Add summary to results
        evaluation_result = {
            'metrics': metrics,
            'total_samples': len(results),
            'results': results,
            'timestamp': time.time(),
        }
        
        # Save to file if output path provided
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(evaluation_result, f, ensure_ascii=False, indent=2)
            
            # Also save summary as CSV
            summary_path = output_path.with_suffix('.summary.csv')
            summary_df = pd.DataFrame(results)
            summary_df.to_csv(summary_path, index=False)
            
            self.logger.info(f"Results saved to {output_path}")
            self.logger.info(f"Summary saved to {summary_path}")
        
        return evaluation_result
    
    def _determine_prediction(self, result: Dict[str, Any]) -> bool:
        """Determine if result indicates gambling."""
        summary = result.get('summary', {})
        
        # Method 1: Overall risk
        overall_risk = summary.get('overall_risk', 'low')
        if overall_risk == 'high':
            return True
        elif overall_risk == 'medium':
            return summary.get('overall_risk_score', 0) > 0.5
        
        # Method 2: Any detector with high score
        for detector_result in result.get('results', []):
            if detector_result.get('status') == 'ok' and detector_result.get('score', 0) > 0.6:
                return True
        
        return False
    
    def _calculate_metrics(self, y_true: List[int], y_pred: List[int]) -> Dict[str, float]:
        """Calculate evaluation metrics."""
        if not y_true or not y_pred:
            return {}
        
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average='binary'
        )
        
        accuracy = accuracy_score(y_true, y_pred)
        
        # Calculate confusion matrix manually
        tp = fp = tn = fn = 0
        for true, pred in zip(y_true, y_pred):
            if true == 1 and pred == 1:
                tp += 1
            elif true == 0 and pred == 1:
                fp += 1
            elif true == 0 and pred == 0:
                tn += 1
            elif true == 1 and pred == 0:
                fn += 1
        
        return {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'true_positives': tp,
            'false_positives': fp,
            'true_negatives': tn,
            'false_negatives': fn,
            'total_positives': sum(y_true),
            'total_negatives': len(y_true) - sum(y_true),
        }
    
    def print_report(self, evaluation_result: Dict[str, Any]):
        """Print evaluation report."""
        metrics = evaluation_result.get('metrics', {})
        total = evaluation_result.get('total_samples', 0)
        
        print("\n" + "="*60)
        print("DETECTION ENGINE EVALUATION REPORT")
        print("="*60)
        
        if not metrics:
            print("No metrics available")
            return
        
        print(f"\n📊 Performance Metrics:")
        print(f"  Accuracy:  {metrics.get('accuracy', 0):.3f}")
        print(f"  Precision: {metrics.get('precision', 0):.3f}")
        print(f"  Recall:    {metrics.get('recall', 0):.3f}")
        print(f"  F1-Score:  {metrics.get('f1_score', 0):.3f}")
        
        print(f"\n🔍 Confusion Matrix:")
        print(f"  True Positives:  {metrics.get('true_positives', 0)}")
        print(f"  False Positives: {metrics.get('false_positives', 0)}")
        print(f"  True Negatives:  {metrics.get('true_negatives', 0)}")
        print(f"  False Negatives: {metrics.get('false_negatives', 0)}")
        
        print(f"\n📈 Class Distribution:")
        print(f"  Total Samples: {total}")
        print(f"  Gambling (Positive): {metrics.get('total_positives', 0)}")
        print(f"  Normal (Negative):   {metrics.get('total_negatives', 0)}")
        
        # Calculate rates
        if metrics.get('true_positives', 0) + metrics.get('false_negatives', 0) > 0:
            detection_rate = metrics['true_positives'] / (metrics['true_positives'] + metrics['false_negatives'])
            print(f"  Detection Rate: {detection_rate:.3f}")
        
        if metrics.get('false_positives', 0) + metrics.get('true_negatives', 0) > 0:
            false_positive_rate = metrics['false_positives'] / (metrics['false_positives'] + metrics['true_negatives'])
            print(f"  False Positive Rate: {false_positive_rate:.3f}")
        
        print("\n" + "="*60)


def main():
    """Main function for command line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate detection engine')
    parser.add_argument('--csv', required=True, help='Path to labeled CSV file')
    parser.add_argument('--output', help='Path to output JSON file')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Configure logging
    level = logging.INFO if args.verbose else logging.WARNING
    logging.basicConfig(level=level, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Run evaluation
    evaluator = DetectionEvaluator()
    
    print(f"Evaluating detection engine with {args.csv}")
    result = evaluator.evaluate_csv(args.csv, args.output)
    
    # Print report
    evaluator.print_report(result)


if __name__ == "__main__":
    main()