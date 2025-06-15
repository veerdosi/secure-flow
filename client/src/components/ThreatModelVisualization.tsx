'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { ThreatModel, ThreatNode, ThreatEdge, AttackVector } from '@/types';

interface ThreatModelVisualizationProps {
  threatModel?: ThreatModel;
}

const ThreatModelVisualization: React.FC<ThreatModelVisualizationProps> = ({ threatModel }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ThreatNode | null>(null);
  const [hoveredAttackVector, setHoveredAttackVector] = useState<AttackVector | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0b);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Create threat model from actual data
    if (threatModel && threatModel.nodes.length > 0) {
      createRealThreatModel(scene, threatModel);
    } else {
      createFallbackModel(scene);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      scene.rotation.y += 0.002;
      renderer.render(scene, camera);
    };

    animate();
    setIsLoaded(true);

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;

      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [threatModel]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 0xff073a;
      case 'HIGH': return 0xff6b35;
      case 'MEDIUM': return 0xffeb3b;
      case 'LOW': return 0x39ff14;
      default: return 0x00d4ff;
    }
  };

  const getNodeShape = (type: string) => {
    switch (type) {
      case 'database': return new THREE.BoxGeometry(1, 0.5, 1);
      case 'api': return new THREE.ConeGeometry(0.5, 1, 6);
      case 'frontend': return new THREE.OctahedronGeometry(0.5);
      case 'external': return new THREE.TetrahedronGeometry(0.5);
      default: return new THREE.SphereGeometry(0.5, 16, 16);
    }
  };

  const createRealThreatModel = (scene: THREE.Scene, model: ThreatModel) => {
    if (!model || !model.nodes || !Array.isArray(model.nodes)) {
      createFallbackModel(scene);
      return;
    }

    try {
      const nodeObjects = new Map<string, THREE.Mesh>();

      // Position nodes in a circle or grid
      const radius = 4;
      const nodeCount = model.nodes.length;

      for (let nodeIndex = 0; nodeIndex < model.nodes.length; nodeIndex++) {
        const node = model.nodes[nodeIndex];
        if (!node) continue;

        const angle = (nodeIndex / nodeCount) * Math.PI * 2;
        const x = node.position?.x || Math.cos(angle) * radius;
        const y = node.position?.y || Math.sin(angle) * radius;
        const z = node.position?.z || 0;

        const geometry = getNodeShape(node.type);
        const material = new THREE.MeshPhongMaterial({
          color: getRiskColor(node.riskLevel),
          transparent: true,
          opacity: 0.8,
          shininess: 100
        });

        const nodeMesh = new THREE.Mesh(geometry, material);
        nodeMesh.position.set(x, y, z);
        nodeMesh.userData = { node, type: 'threatNode' };

        scene.add(nodeMesh);
        nodeObjects.set(node.id, nodeMesh);
      }

      // Create edges/connections
      if (model.edges && Array.isArray(model.edges)) {
        for (const edge of model.edges) {
          if (!edge) continue;
          
          const sourceNode = nodeObjects.get(edge.source);
          const targetNode = nodeObjects.get(edge.target);

          if (sourceNode && targetNode) {
            const points = [sourceNode.position, targetNode.position];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const lineColor = edge.encrypted ? 0x39ff14 : 
                             edge.authenticated ? 0xffeb3b : 
                             getRiskColor(edge.riskLevel);

            const lineMaterial = new THREE.LineBasicMaterial({
              color: lineColor,
              transparent: true,
              opacity: edge.encrypted ? 0.8 : 0.4,
              linewidth: edge.type === 'trust_boundary' ? 3 : 1
            });

            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData = { edge, type: 'threatEdge' };
            scene.add(line);
          }
        }
      }

      addLighting(scene);
    } catch (error) {
      console.warn('Error creating threat model:', error);
      createFallbackModel(scene);
    }
  };

  const createFallbackModel = (scene: THREE.Scene) => {
    // Create a simple fallback when no threat model data is available
    const fallbackText = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + 
      btoa('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128"><text x="128" y="64" text-anchor="middle" font-family="Arial" font-size="16" fill="white">No Threat Model Available</text></svg>'));
    
    const material = new THREE.MeshBasicMaterial({ map: fallbackText, transparent: true });
    const geometry = new THREE.PlaneGeometry(4, 2);
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    addLighting(scene);
  };

  const addLighting = (scene: THREE.Scene) => {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x00d4ff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x39ff14, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/80">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Threat Model Stats */}
      {threatModel && (
        <div className="absolute top-4 right-4 bg-dark-card/90 backdrop-blur-sm border border-dark-border rounded-lg p-3 max-w-sm">
          <h4 className="text-sm font-semibold mb-2">Threat Model Analysis</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Components:</span>
              <span className="text-cyber-blue">{threatModel.nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Connections:</span>
              <span className="text-cyber-blue">{threatModel.edges.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Attack Vectors:</span>
              <span className="text-cyber-orange">{threatModel.attackVectors.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Attack Surface:</span>
              <span className="text-cyber-red">{threatModel.attackSurface.score || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-dark-card/90 backdrop-blur-sm border border-dark-border rounded-lg p-3">
        <h4 className="text-sm font-semibold mb-2">Risk Levels</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-green rounded-full"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-orange rounded-full"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-red rounded-full animate-pulse"></div>
            <span>Critical Risk</span>
          </div>
        </div>
      </div>

      {/* Attack Surface Summary */}
      {threatModel?.attackSurface && (
        <div className="absolute bottom-4 left-4 bg-dark-card/90 backdrop-blur-sm border border-dark-border rounded-lg p-3">
          <h4 className="text-sm font-semibold mb-2">Attack Surface</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Endpoints: {threatModel.attackSurface.endpoints}</div>
            <div>Input Points: {threatModel.attackSurface.inputPoints}</div>
            <div>External Deps: {threatModel.attackSurface.externalDependencies}</div>
            <div>Privileged: {threatModel.attackSurface.privilegedFunctions}</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-xs text-gray-400">
        <p>🖱️ Interactive 3D threat model</p>
        <p>💫 Real-time risk visualization</p>
      </div>
    </div>
  );
};

export default ThreatModelVisualization;