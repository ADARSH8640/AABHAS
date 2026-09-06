import torch
import torch.nn as nn
from torchvision.models import (
    convnext_tiny,
    ConvNeXt_Tiny_Weights,
    swin_t,
    Swin_T_Weights,
)


class RockfallModel(nn.Module):
    def __init__(self, num_classes=2):
        super().__init__()

        # ConvNeXt branch
        convnext_weights = ConvNeXt_Tiny_Weights.DEFAULT
        self.convnext = convnext_tiny(weights=convnext_weights)

        convnext_features = self.convnext.classifier[-1].in_features
        self.convnext.classifier = nn.Identity()

        # Swin Transformer branch
        swin_weights = Swin_T_Weights.DEFAULT
        self.swin = swin_t(weights=swin_weights)

        swin_features = self.swin.head.in_features
        self.swin.head = nn.Identity()

        # Feature dimensions after both backbones
        fused_features = convnext_features + swin_features

        # Two-class risk classifier
        self.classifier = nn.Sequential(
            nn.Linear(fused_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        # ConvNeXt returns a spatial feature map after removing classifier
        convnext_features = self.convnext(x)

        # Convert [B, C, H, W] to [B, C]
        if convnext_features.dim() == 4:
            convnext_features = torch.mean(
                convnext_features,
                dim=(2, 3),
            )

        # Swin returns [B, C]
        swin_features = self.swin(x)

        # Fuse the two feature vectors
        fused_features = torch.cat(
            [convnext_features, swin_features],
            dim=1,
        )

        return self.classifier(fused_features)