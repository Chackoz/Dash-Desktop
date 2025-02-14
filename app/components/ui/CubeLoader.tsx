import React from 'react';

const CubeLoader = () => {
  return (
    <div className="relative">
      <style>
        {`
          @keyframes cube-spin {
            0% {
              transform: rotate(45deg) rotateX(-25deg) rotateY(25deg);
            }
            50% {
              transform: rotate(45deg) rotateX(-385deg) rotateY(25deg);
            }
            100% {
              transform: rotate(45deg) rotateX(-385deg) rotateY(385deg);
            }
          }
          .cube-spinner {
            width: 44px;
            height: 44px;
            animation: cube-spin 2s infinite ease;
            transform-style: preserve-3d;
          }
          .cube-face {
            height: 100%;
            position: absolute;
            width: 100%;
            border: 2px solid currentColor;
          }
          .cube-face:nth-child(1) {
            transform: translateZ(-22px) rotateY(180deg);
          }
          .cube-face:nth-child(2) {
            transform: rotateY(-270deg) translateX(50%);
            transform-origin: top right;
          }
          .cube-face:nth-child(3) {
            transform: rotateY(270deg) translateX(-50%);
            transform-origin: center left;
          }
          .cube-face:nth-child(4) {
            transform: rotateX(90deg) translateY(-50%);
            transform-origin: top center;
          }
          .cube-face:nth-child(5) {
            transform: rotateX(-90deg) translateY(50%);
            transform-origin: bottom center;
          }
          .cube-face:nth-child(6) {
            transform: translateZ(22px);
          }
        `}
      </style>
      <div className="cube-spinner text-primary">
        <div className="cube-face" />
        <div className="cube-face" />
        <div className="cube-face" />
        <div className="cube-face" />
        <div className="cube-face" />
        <div className="cube-face" />
      </div>
    </div>
  );
};

export default CubeLoader;