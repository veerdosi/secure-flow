'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { ThreatModel } from '@/types';

interface ThreatModelVisualizationProps {
  threatModel?: ThreatModel;
}

const ThreatModelVisualization: React.FC<ThreatModelVisualizationProps> = ({ threatModel }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const [isLoaded, setIsLoaded] = useState(false);

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

    // Create mock 3D threat model
    createThreatModel(scene);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate the entire scene slowly
      scene.rotation.y += 0.005;

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
  }, []);

  const createThreatModel = (scene: THREE.Scene) => {
    // Create nodes representing system components
    const nodes = [
      { position: [0, 2, 0], color: 0x39ff14, label: 'API Gateway', vulnerable: false },
      { position: [-3, 0, 0], color: 0xff6b35, label: 'Database', vulnerable: true },
      { position: [3, 0, 0], color: 0x00d4ff, label: 'Auth Service', vulnerable: false },
      { position: [0, -2, 0], color: 0xff073a, label: 'File System', vulnerable: true },
      { position: [0, 0, 3], color: 0x39ff14, label: 'External API', vulnerable: false },
    ];

    const nodeObjects: THREE.Mesh[] = [];

    nodes.forEach((node, index) => {
      // Create node geometry
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.8,
        shininess: 100
      });

      const nodeMesh = new THREE.Mesh(geometry, material);
      nodeMesh.position.set(node.position[0], node.position[1], node.position[2]);

      // Add pulsing animation for vulnerable nodes
      if (node.vulnerable) {
        const pulseAnimation = () => {
          const time = Date.now() * 0.005;
          nodeMesh.scale.setScalar(1 + Math.sin(time) * 0.2);
          material.opacity = 0.6 + Math.sin(time) * 0.3;
        };

        const animate = () => {
          pulseAnimation();
          requestAnimationFrame(animate);
        };
        animate();
      }

      scene.add(nodeMesh);
      nodeObjects.push(nodeMesh);

      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.1,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(nodeMesh.position);
      scene.add(glow);
    });

    // Create connections between nodes
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 3], [0, 4]
    ];

    connections.forEach(([startIdx, endIdx]) => {
      const start = nodes[startIdx];
      const end = nodes[endIdx];

      const startPos = new THREE.Vector3(start.position[0], start.position[1], start.position[2]);
      const endPos = new THREE.Vector3(end.position[0], end.position[1], end.position[2]);

      // Create animated line
      const points = [];
      const segments = 20;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(startPos.clone().lerp(endPos, t));
      }

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.4,
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);

      // Add flowing particles along the line
      const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4ff });

      for (let i = 0; i < 3; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        scene.add(particle);

        const animateParticle = () => {
          const time = (Date.now() * 0.001 + i * 2) % 1;
          particle.position.copy(startPos.clone().lerp(endPos, time));
          requestAnimationFrame(animateParticle);
        };
        animateParticle();
      }
    });

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0x00d4ff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add point light for dramatic effect
    const pointLight = new THREE.PointLight(0x39ff14, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/80">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-dark-card/90 backdrop-blur-sm border border-dark-border rounded-lg p-3">
        <h4 className="text-sm font-semibold mb-2">System Components</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-green rounded-full"></div>
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-orange rounded-full"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-red rounded-full animate-pulse"></div>
            <span>Vulnerable</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400">
        <p>🖱️ Interactive 3D threat model</p>
        <p>💫 Animated data flows and vulnerabilities</p>
      </div>
    </div>
  );
};

export default ThreatModelVisualization;
