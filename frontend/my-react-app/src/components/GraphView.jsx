import { useEffect, useRef } from "react";
import * as d3 from "d3";

const VIEW_W = 560;
const VIEW_H = 420;

function getStateAlias(index) {
  let value = index;
  let alias = "";

  do {
    alias = String.fromCharCode(65 + (value % 26)) + alias;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return alias;
}

export default function GraphView({ data, title, theme }) {
  const svgRef = useRef();

  const runZoomAction = (actionName) => {
    const svg = svgRef.current;
    if (svg && typeof svg[actionName] === "function") {
      svg[actionName]();
    }
  };

  useEffect(() => {
    if (!data) {
      return undefined;
    }

    const themeRoot = svgRef.current?.closest("[data-theme]") ?? document.documentElement;
    const css = getComputedStyle(themeRoot);
    const palette = {
      edge: css.getPropertyValue("--graph-edge").trim(),
      edgeLabel: css.getPropertyValue("--graph-edge-label").trim(),
      edgeLabelStroke: css.getPropertyValue("--graph-edge-label-stroke").trim(),
      nodeBase: css.getPropertyValue("--graph-node").trim(),
      nodeStroke: css.getPropertyValue("--graph-node-stroke").trim(),
      nodeText: css.getPropertyValue("--graph-node-text").trim(),
      startStroke: css.getPropertyValue("--graph-start-stroke").trim(),
      acceptStroke: css.getPropertyValue("--graph-accept-stroke").trim(),
      startFrom: css.getPropertyValue("--graph-start-from").trim(),
      startTo: css.getPropertyValue("--graph-start-to").trim(),
      acceptFrom: css.getPropertyValue("--graph-accept-from").trim(),
      acceptTo: css.getPropertyValue("--graph-accept-to").trim(),
    };

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    const width = VIEW_W;
    const height = VIEW_H;
    const radius = 24;

    const defs = svg.append("defs");

    defs
      .append("marker")
      .attr("id", `arrowhead-${theme}-${title}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", palette.edge);

    const filter = defs
      .append("filter")
      .attr("id", `glow-${theme}-${title}`)
      .attr("x", "-30%")
      .attr("y", "-30%")
      .attr("width", "160%")
      .attr("height", "160%");

    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const startGradientId = `startGrad-${theme}-${title}`;
    const acceptGradientId = `acceptGrad-${theme}-${title}`;

    const startGrad = defs.append("radialGradient").attr("id", startGradientId);
    startGrad.append("stop").attr("offset", "0%").attr("stop-color", palette.startFrom);
    startGrad.append("stop").attr("offset", "100%").attr("stop-color", palette.startTo);

    const acceptGrad = defs.append("radialGradient").attr("id", acceptGradientId);
    acceptGrad.append("stop").attr("offset", "0%").attr("stop-color", palette.acceptFrom);
    acceptGrad.append("stop").attr("offset", "100%").attr("stop-color", palette.acceptTo);

    const root = svg.append("g").attr("class", "zoom-root");

    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        root.attr("transform", event.transform);
      });

    svg.call(zoom).on("dblclick.zoom", null);

    svgElement._zoomIn = () => svg.transition().duration(300).call(zoom.scaleBy, 1.4);
    svgElement._zoomOut = () => svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    svgElement._zoomReset = () =>
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);

    const acceptSet = new Set(data.accept || []);
    const nodes = data.nodes.map((node) => ({ ...node }));
    const links = data.links.map((link) => ({ ...link }));
    const aliasMap =
      title === "DFA"
        ? new Map(nodes.map((node, index) => [node.id, getStateAlias(index)]))
        : new Map();

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((datum) => datum.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-550))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(radius + 24));

    const linkPairCount = {};
    links.forEach((link) => {
      const key = [
        typeof link.source === "object" ? link.source.id : link.source,
        typeof link.target === "object" ? link.target.id : link.target,
      ]
        .sort()
        .join("<->");
      linkPairCount[key] = (linkPairCount[key] || 0) + 1;
    });

    const linkPairIndex = {};
    links.forEach((link) => {
      const source = typeof link.source === "object" ? link.source.id : link.source;
      const target = typeof link.target === "object" ? link.target.id : link.target;
      const key = [source, target].sort().join("<->");
      linkPairIndex[key] = (linkPairIndex[key] || 0) + 1;
      link._pairIndex = linkPairIndex[key];
      link._pairTotal = linkPairCount[key];
    });

    const linkElements = root
      .append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", palette.edge)
      .attr("stroke-width", 1.8)
      .attr("marker-end", `url(#arrowhead-${theme}-${title})`);

    const edgeLabels = root
      .append("g")
      .attr("class", "edge-labels")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", palette.edgeLabel)
      .attr("font-size", "11px")
      .attr("font-family", "'Space Grotesk', sans-serif")
      .attr("font-weight", "500")
      .text((datum) => datum.label);

    const nodeElements = root
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "grab")
      .call(
        d3
          .drag()
          .on("start", (event, datum) => {
            if (!event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            datum.fx = datum.x;
            datum.fy = datum.y;
            d3.select(event.sourceEvent.target.closest("g.node")).style("cursor", "grabbing");
          })
          .on("drag", (event, datum) => {
            datum.fx = event.x;
            datum.fy = event.y;
          })
          .on("end", (event, datum) => {
            if (!event.active) {
              simulation.alphaTarget(0);
            }
            datum.fx = null;
            datum.fy = null;
            d3.select(event.sourceEvent.target.closest("g.node")).style("cursor", "grab");
          })
      );

    nodeElements
      .append("circle")
      .attr("r", radius)
      .attr("fill", (datum) => {
        if (datum.id === data.start) {
          return `url(#${startGradientId})`;
        }
        if (acceptSet.has(datum.id)) {
          return `url(#${acceptGradientId})`;
        }
        return palette.nodeBase;
      })
      .attr("stroke", (datum) => {
        if (datum.id === data.start) {
          return palette.startStroke;
        }
        if (acceptSet.has(datum.id)) {
          return palette.acceptStroke;
        }
        return palette.nodeStroke;
      })
      .attr("stroke-width", 2)
      .attr("filter", (datum) =>
        datum.id === data.start || acceptSet.has(datum.id) ? `url(#glow-${theme}-${title})` : null
      );

    nodeElements
      .filter((datum) => acceptSet.has(datum.id))
      .append("circle")
      .attr("r", radius - 6)
      .attr("fill", "none")
      .attr("stroke", palette.acceptStroke)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,2");

    nodeElements
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", palette.nodeText)
      .attr("font-size", (datum) => {
        const label = aliasMap.get(datum.id) ?? datum.id;
        return label.length > 5 ? "8px" : "10px";
      })
      .attr("font-family", "'Space Grotesk', sans-serif")
      .attr("font-weight", "700")
      .attr("pointer-events", "none")
      .text((datum) => aliasMap.get(datum.id) ?? datum.id);

    const startArrow = root
      .append("line")
      .attr("stroke", palette.startStroke)
      .attr("stroke-width", 2)
      .attr("marker-end", `url(#arrowhead-${theme}-${title})`)
      .attr("stroke-dasharray", "4,3");

    simulation.on("tick", () => {
      linkElements.attr("d", (datum) => {
        const sourceX = datum.source.x;
        const sourceY = datum.source.y;
        const targetX = datum.target.x;
        const targetY = datum.target.y;

        if (datum.source.id === datum.target.id) {
          const loopRadius = 30;
          return `M ${sourceX},${sourceY - radius} C ${sourceX - loopRadius * 2},${
            sourceY - radius - loopRadius * 2
          } ${sourceX + loopRadius * 2},${sourceY - radius - loopRadius * 2} ${sourceX},${
            sourceY - radius
          }`;
        }

        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const ratio = radius / distance;
        const startX = sourceX + dx * ratio;
        const startY = sourceY + dy * ratio;
        const endX = targetX - dx * ratio;
        const endY = targetY - dy * ratio;

        const hasBothDirections =
          links.some(
            (other) => other.source.id === datum.target.id && other.target.id === datum.source.id
          ) || datum._pairTotal > 1;

        if (hasBothDirections) {
          const bend = 50;
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          const nx = -dy / distance;
          const ny = dx / distance;
          const sign = datum._pairIndex % 2 === 0 ? 1 : -1;
          return `M ${startX},${startY} Q ${midX + sign * nx * bend},${
            midY + sign * ny * bend
          } ${endX},${endY}`;
        }

        return `M ${startX},${startY} L ${endX},${endY}`;
      });

      edgeLabels
        .attr("x", (datum) => {
          if (datum.source.id === datum.target.id) {
            return datum.source.x;
          }
          const sign = datum._pairIndex % 2 === 0 ? 1 : -1;
          return (datum.source.x + datum.target.x) / 2 + sign * 14;
        })
        .attr("y", (datum) => {
          if (datum.source.id === datum.target.id) {
            return datum.source.y - 60;
          }
          const sign = datum._pairIndex % 2 === 0 ? 1 : -1;
          return (datum.source.y + datum.target.y) / 2 - sign * 14;
        });

      nodeElements.attr("transform", (datum) => `translate(${datum.x},${datum.y})`);

      const startNode = nodes.find((node) => node.id === data.start);
      if (startNode) {
        startArrow
          .attr("x1", startNode.x - radius - 38)
          .attr("y1", startNode.y)
          .attr("x2", startNode.x - radius - 2)
          .attr("y2", startNode.y);
      }
    });

    return () => simulation.stop();
  }, [data, theme, title]);

  return (
    <div className="graph-view">
      {title && <div className="graph-title">{title}</div>}

      <div className="graph-canvas-shell">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          className="graph-canvas"
        />

        <div className="graph-controls">
          {[
            { label: "+", title: "Zoom in", actionName: "_zoomIn" },
            { label: "-", title: "Zoom out", actionName: "_zoomOut" },
            { label: "R", title: "Reset", actionName: "_zoomReset" },
          ].map(({ label, title: tooltip, actionName }) => (
            <button
              key={label}
              type="button"
              className="graph-control-button"
              onClick={() => runZoomAction(actionName)}
              title={tooltip}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="graph-hint">Scroll to zoom. Drag to pan. Drag nodes to move.</div>
      </div>

      <div className="graph-legend">
        {[
          { color: "var(--graph-start-from)", label: "Start" },
          { color: "var(--graph-accept-from)", label: "Accept" },
          { color: "var(--graph-node)", label: "State" },
        ].map(({ color, label }) => (
          <span key={label} className="graph-legend-item">
            <span className="graph-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {title === "DFA" && (
        <div className="dfa-aliases">
          {data.nodes.map((node, index) => (
            <span key={node.id} className="dfa-alias-chip">
              {getStateAlias(index)} = {node.id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
