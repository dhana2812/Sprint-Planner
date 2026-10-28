/**
 * SprintForge AI - Interactive SVG Dependency DAG Renderer
 */

const CATEGORY_COLORS = {
  Database: '#8B5CF6',
  Backend: '#06B6D4',
  Frontend: '#10B981',
  'DevOps/Infra': '#F59E0B',
  'QA/Testing': '#F43F5E'
};

function renderDAG(svgElement, tasks, criticalPath = []) {
  if (!svgElement) return;
  svgElement.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    svgElement.setAttribute('viewBox', '0 0 800 300');
    svgElement.style.minWidth = '100%';
    svgElement.style.height = '300px';
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '400');
    text.setAttribute('y', '150');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#64748B');
    text.setAttribute('font-size', '14px');
    text.textContent = 'No tasks available to render dependency graph.';
    svgElement.appendChild(text);
    return;
  }

  const criticalSet = new Set(criticalPath || []);
  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.id, t));

  // 1. Group tasks by topological layer using a Map to avoid sparse arrays
  const layerMap = new Map();
  tasks.forEach(t => {
    const l = typeof t.layer === 'number' ? t.layer : 0;
    if (!layerMap.has(l)) layerMap.set(l, []);
    layerMap.get(l).push(t);
  });

  const sortedLayerKeys = Array.from(layerMap.keys()).sort((a, b) => a - b);
  const layers = sortedLayerKeys.map(k => layerMap.get(k));

  const totalLayers = Math.max(1, layers.length);
  const maxNodesInLayer = Math.max(...layers.map(l => l.length), 1);

  const layerSpacingX = 220;
  const svgWidth = Math.max(900, (totalLayers + 1) * layerSpacingX);
  const svgHeight = Math.max(540, (maxNodesInLayer + 1) * 110);

  svgElement.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  svgElement.style.minWidth = `${svgWidth}px`;
  svgElement.style.height = `${svgHeight}px`;

  // Compute node coordinates
  const nodeCoords = new Map();
  const startX = 110;
  const effectiveSpacingX = totalLayers > 1 ? (svgWidth - 220) / (totalLayers - 1) : 0;

  layers.forEach((layerTasks, layerIdx) => {
    const x = totalLayers === 1 ? svgWidth / 2 : startX + layerIdx * effectiveSpacingX;
    const nodeSpacingY = svgHeight / (layerTasks.length + 1);

    layerTasks.forEach((task, nodeIdx) => {
      const y = (nodeIdx + 1) * nodeSpacingY;
      nodeCoords.set(task.id, { x, y, task });
    });
  });

  // Create SVG Definitions for markers & filters
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B" />
    </marker>
    <marker id="arrow-critical" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
    </marker>
    <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#06B6D4" />
    </marker>
    <filter id="glow-critical" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  `;
  svgElement.appendChild(defs);

  // Group for layer guide lines
  const guidesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  guidesGroup.setAttribute('id', 'dag-layer-guides');
  svgElement.appendChild(guidesGroup);

  layers.forEach((_, layerIdx) => {
    const x = totalLayers === 1 ? svgWidth / 2 : startX + layerIdx * effectiveSpacingX;
    const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guideLine.setAttribute('x1', x);
    guideLine.setAttribute('y1', 20);
    guideLine.setAttribute('x2', x);
    guideLine.setAttribute('y2', svgHeight - 20);
    guideLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.04)');
    guideLine.setAttribute('stroke-dasharray', '4 4');
    guidesGroup.appendChild(guideLine);

    const layerTag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    layerTag.setAttribute('x', x);
    layerTag.setAttribute('y', 28);
    layerTag.setAttribute('text-anchor', 'middle');
    layerTag.setAttribute('fill', 'rgba(148, 163, 184, 0.5)');
    layerTag.setAttribute('font-size', '10px');
    layerTag.setAttribute('font-family', 'JetBrains Mono, monospace');
    layerTag.setAttribute('font-weight', '700');
    layerTag.textContent = `PHASE ${layerIdx + 1}`;
    guidesGroup.appendChild(layerTag);
  });

  const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgesGroup.setAttribute('id', 'dag-edges');
  svgElement.appendChild(edgesGroup);

  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodesGroup.setAttribute('id', 'dag-nodes');
  svgElement.appendChild(nodesGroup);

  // Draw Edges
  tasks.forEach(task => {
    const targetCoord = nodeCoords.get(task.id);
    if (!targetCoord) return;

    const prereqs = Array.isArray(task.prerequisites) ? task.prerequisites : [];
    prereqs.forEach(preId => {
      const sourceCoord = nodeCoords.get(preId);
      if (!sourceCoord) return;

      const isCriticalEdge = criticalSet.has(task.id) && criticalSet.has(preId);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const dx = (targetCoord.x - sourceCoord.x) * 0.5;
      const d = `M ${sourceCoord.x} ${sourceCoord.y} C ${sourceCoord.x + dx} ${sourceCoord.y}, ${targetCoord.x - dx} ${targetCoord.y}, ${targetCoord.x} ${targetCoord.y}`;

      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', isCriticalEdge ? '#F59E0B' : 'rgba(255, 255, 255, 0.18)');
      path.setAttribute('stroke-width', isCriticalEdge ? '2.5' : '1.5');
      path.setAttribute('marker-end', isCriticalEdge ? 'url(#arrow-critical)' : 'url(#arrow)');
      path.setAttribute('data-source', preId);
      path.setAttribute('data-target', task.id);
      path.setAttribute('class', 'dag-edge ' + (isCriticalEdge ? 'critical-edge' : ''));

      edgesGroup.appendChild(path);
    });
  });

  // Draw Nodes
  nodeCoords.forEach(({ x, y, task }) => {
    const isCritical = criticalSet.has(task.id);
    const categoryColor = CATEGORY_COLORS[task.category] || '#06B6D4';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x}, ${y})`);
    g.setAttribute('class', 'dag-node ' + (isCritical ? 'critical-node' : ''));
    g.setAttribute('data-task-id', task.id);
    g.style.cursor = 'pointer';

    // Outer glow for critical path
    if (isCritical) {
      const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glowCircle.setAttribute('r', '27');
      glowCircle.setAttribute('fill', 'none');
      glowCircle.setAttribute('stroke', '#F59E0B');
      glowCircle.setAttribute('stroke-width', '2');
      glowCircle.setAttribute('opacity', '0.7');
      glowCircle.setAttribute('stroke-dasharray', '4 2');
      glowCircle.setAttribute('filter', 'url(#glow-critical)');
      g.appendChild(glowCircle);
    }

    // Node body circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '20');
    circle.setAttribute('fill', '#0F172A');
    circle.setAttribute('stroke', categoryColor);
    circle.setAttribute('stroke-width', '2.5');
    g.appendChild(circle);

    // Inner Text: Task ID abbreviation
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dy', '4');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '10px');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'JetBrains Mono, monospace');
    text.textContent = task.id.replace('TASK-', 'T');
    g.appendChild(text);

    // Label below node
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dy', '34');
    label.setAttribute('fill', '#94A3B8');
    label.setAttribute('font-size', '9px');
    label.setAttribute('font-weight', '600');
    label.setAttribute('font-family', 'Plus Jakarta Sans, sans-serif');
    const truncatedTitle = task.title.length > 20 ? task.title.substring(0, 18) + '..' : task.title;
    label.textContent = truncatedTitle;
    g.appendChild(label);

    // Points Pill Badge above node
    const ptsPill = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ptsPill.setAttribute('text-anchor', 'middle');
    ptsPill.setAttribute('dy', '-24');
    ptsPill.setAttribute('fill', isCritical ? '#F59E0B' : '#06B6D4');
    ptsPill.setAttribute('font-size', '9px');
    ptsPill.setAttribute('font-weight', '800');
    ptsPill.setAttribute('font-family', 'JetBrains Mono, monospace');
    ptsPill.textContent = `${task.storyPoints} pts`;
    g.appendChild(ptsPill);

    // Node Interaction: hover & focus
    g.addEventListener('mouseenter', () => highlightConnections(task.id, svgElement));
    g.addEventListener('mouseleave', () => resetHighlights(svgElement));
    g.addEventListener('click', () => {
      if (window.App && typeof window.App.openTaskModalById === 'function') {
        window.App.openTaskModalById(task.id);
      } else if (window.showTaskDetailsModal) {
        window.showTaskDetailsModal(task);
      }
    });

    nodesGroup.appendChild(g);
  });
}

function highlightConnections(taskId, svg) {
  const edges = svg.querySelectorAll('.dag-edge');
  edges.forEach(edge => {
    const src = edge.getAttribute('data-source');
    const tgt = edge.getAttribute('data-target');
    if (src === taskId || tgt === taskId) {
      edge.setAttribute('stroke', '#06B6D4');
      edge.setAttribute('stroke-width', '3');
      edge.setAttribute('marker-end', 'url(#arrow-active)');
      edge.setAttribute('opacity', '1');
    } else {
      edge.setAttribute('opacity', '0.12');
    }
  });

  const nodes = svg.querySelectorAll('.dag-node');
  nodes.forEach(node => {
    const id = node.getAttribute('data-task-id');
    if (id === taskId) {
      node.style.transform = `${node.getAttribute('transform')} scale(1.15)`;
      node.style.transformOrigin = 'center';
      node.style.transition = 'transform 0.2s ease';
    } else {
      node.style.opacity = '0.5';
    }
  });
}

function resetHighlights(svg) {
  const edges = svg.querySelectorAll('.dag-edge');
  edges.forEach(edge => {
    const isCritical = edge.classList.contains('critical-edge');
    edge.setAttribute('stroke', isCritical ? '#F59E0B' : 'rgba(255, 255, 255, 0.18)');
    edge.setAttribute('stroke-width', isCritical ? '2.5' : '1.5');
    edge.setAttribute('marker-end', isCritical ? 'url(#arrow-critical)' : 'url(#arrow)');
    edge.setAttribute('opacity', '1');
  });

  const nodes = svg.querySelectorAll('.dag-node');
  nodes.forEach(node => {
    node.style.transform = node.getAttribute('transform');
    node.style.opacity = '1';
  });
}
