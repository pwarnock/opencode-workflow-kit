# Python Data Science Template

Python data science project with Jupyter notebooks, data processing, and Cody-Beads integration for experiment tracking.

## Features

- 🔬  Data analysis with pandas, numpy, matplotlib
- 📊  Jupyter notebook environment
- 🤖  Machine learning with scikit-learn
- 📋  Cody-Beads experiment tracking
- 🔄  Automatic synchronization
- 🧪  Pytest testing setup
- 🐳  Conda environment support

## Quick Start

```bash
# Apply template
cody-beads template apply python-science --name my-data-project

# Setup and run
cd my-data-project
conda env create -f environment.yml python-env
conda activate python-env
jupyter lab
```

## Project Structure

```
my-data-project/
├── notebooks/         # Jupyter notebooks
│   ├── exploratory/
│   ├── experiments/
│   └── results/
├── src/               # Python modules
│   ├── data/
│   ├── models/
│   ├── utils/
│   └── __init__.py
├── data/              # Dataset storage
│   ├── raw/
│   ├── processed/
│   └── external/
├── tests/              # Tests
│   ├── unit/
│   └── integration/
├── environment.yml      # Conda environment
├── requirements.txt      # Python dependencies
├── cody-beads.config.json # Configuration
└── README.md
```

## Configuration

This template configures Cody-Beads integration for:

- **Sync Direction**: Bidirectional
- **Conflict Resolution**: Newer wins (experiment data priority)
- **Auto Sync**: Every 60 minutes
- **Included Labels**: `experiment`, `data`, `model`, `analysis`

## Development Workflow

### Data Processing Pipeline

```bash
# 1. Data ingestion
python src/data/ingest_data.py

# 2. Data cleaning
python src/data/clean_data.py

# 3. Analysis
jupyter notebook notebooks/exploratory/analysis.ipynb

# 4. Modeling
python src/models/train_model.py

# 5. Visualization
jupyter notebook notebooks/results/visualization.ipynb
```

### Running Experiments

```bash
# Track experiments in Beads
cody-beads sync --direction beads-to-cody

# Create new experiment
cody-beads version add --name "experiment-001" --features "test new algorithm"
```

### Testing

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/unit/test_data_processing.py

# Run with coverage
pytest --cov=src tests/
```

## Data Science Tools

### Pre-configured Libraries

```python
# Data manipulation
import pandas as pd
import numpy as np

# Visualization
import matplotlib.pyplot as plt
import seaborn as sns

# Machine learning
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
```

### Jupyter Notebooks

```python
# Example notebook structure
{
 "cells": [
   {
     "cell_type": "markdown",
     "metadata": {},
     "source": ["# Data Analysis"]
   },
   {
     "cell_type": "code",
     "execution_count": null,
     "metadata": {},
     "source": [
        "import pandas as pd\n",
        "df = pd.read_csv('../data/raw/dataset.csv')\n",
        "df.head()"
     ]
   }
 ]
}
```

## Environment Setup

### Conda Environment

```yaml
name: python-science
channels:
  - conda-forge
dependencies:
  - python=3.11
  - pandas=2.0.0
  - numpy=1.24.0
  - matplotlib=3.7.0
  - seaborn=0.12.0
  - scikit-learn=1.3.0
  - jupyter=1.0.0
  - pytest=7.4.0
  - pip
  - pip:
    - @pwarnock/cody-beads-integration
```

### Requirements Installation

```bash
# Install core dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -e .
```

## Experiment Tracking

### Cody Integration

```python
# Track experiments in Cody
from cody_beads_integration import CodyBeadsClient

cody = CodyBeadsClient()
cody.create_experiment(
    name="Algorithm Comparison",
    description="Testing random forest vs gradient boosting",
    tags=["ml", "classification"],
    parameters={
        "algorithms": ["rf", "gb"],
        "features": 15,
        "test_size": 0.2
    }
)
```

### Beads Synchronization

```python
# Sync experiment results to Beads
import beads_client

# Create experiment issue
beadsClient.create_experiment(
    title="Experiment 001 Results",
    description="Random forest achieved 85% accuracy",
    experiment_type="classification",
    results={
        "accuracy": 0.85,
        "precision": 0.82,
        "recall": 0.88,
        "confusion_matrix": [[...]]
    }
)
```

## Best Practices

### Data Organization

```python
# Recommended directory structure
project/
├── data/
│   ├── raw/          # Original datasets
│   ├── processed/     # Cleaned data
│   └── external/      # External datasets
├── notebooks/
│   ├── exploratory/   # Initial analysis
│   ├── experiments/   # Experiment notebooks
│   └── results/       # Result notebooks
├── src/
│   ├── data/          # Data processing functions
│   ├── features/       # Feature engineering
│   ├── models/         # ML models
│   └── utils/         # Utility functions
└── tests/
```

### Experiment Documentation

```python
# Document experiments thoroughly
experiment = {
    "name": "Algorithm Comparison",
    "date": "2025-01-15",
    "objective": "Compare classification algorithms",
    "hypothesis": "Gradient boosting will outperform random forest",
    "methodology": "5-fold cross-validation, same random seed",
    "results": {
        "random_forest": {"accuracy": 0.85, "f1": 0.84},
        "gradient_boosting": {"accuracy": 0.88, "f1": 0.87}
    },
    "conclusion": "Hypothesis confirmed - gradient boosting superior",
    "next_steps": ["Hyperparameter tuning", "Ensemble methods"]
}
```

## Synchronization Strategy

### Cody → Beads
- Experiment plans → Beads tasks
- Algorithm parameters → Beads metadata
- Results → Beads experiment data

### Beads → Cody
- Experiment tasks → Cody features
- Team assignments → Cody project
- Timeline updates → Cody milestones

This template ensures your data science work is properly tracked and synchronized between Cody project planning and Beads task execution.