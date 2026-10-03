"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { State } from "@/lib/model";
import { receptionStyle, inkFor } from "@/lib/reception-style";
import {
  dimensions,
  chairSize,
  chairPosition,
  serpentCenter,
} from "@/lib/layout";
export default function Seating3D({
  state,
  returningToPlan = false,
  onPlanReady,
  onReady,
}: {
  state: State;
  returningToPlan?: boolean;
  onPlanReady?: () => void;
  onReady?: () => void;
}) {
  const cameraMove = useRef<
    ((flat: boolean, done?: () => void) => void) | null
  >(null);
  const readyCallback = useRef(onPlanReady);
  readyCallback.current = onPlanReady;
  const flatRequested = useRef(returningToPlan);
  flatRequested.current = returningToPlan;
  const ready = useRef(onReady);
  ready.current = onReady;
  const entered = useRef(false);
  const host = useRef<HTMLDivElement>(null),
    [error, setError] = useState(""),
    [hover, setHover] = useState("");
  useEffect(() => {
    const el = host.current!,
      style = receptionStyle(state.event);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(
        "3D needs WebGL on this device. You can continue using the 2D plan.",
      );
      return;
    }
    const scene = new THREE.Scene(),
      w = state.event.room_width_ft || 80,
      d = state.event.room_depth_ft || 60;
    scene.background = new THREE.Color("#eee9e1");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(w * 0.7, Math.max(w, d) * 0.8, d * 0.8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(w / 2, 0, -d / 2);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 8;
    controls.maxDistance = 400;
    controls.update();
    scene.add(new THREE.HemisphereLight("#ffffff", "#b5a493", 3));
    const light = new THREE.DirectionalLight("#ffffff", 3);
    light.position.set(20, 80, 30);
    scene.add(light);
    function mesh(
      geometry: THREE.BufferGeometry,
      color: string,
      parent: THREE.Object3D = scene,
    ) {
      const m = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
      );
      parent.add(m);
      return m;
    }
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.2, d),
      new THREE.MeshBasicMaterial({ color: "#eee9e1" }),
    );
    scene.add(floor);
    floor.position.set(w / 2, -0.15, -d / 2);
    const grid = new THREE.GridHelper(
      Math.max(w, d),
      Math.ceil(Math.max(w, d) / 2),
      "#c5b9a7",
      "#d3c8b8",
    );
    grid.position.set(w / 2, 0.01, -d / 2);
    scene.add(grid);
    const pickable: THREE.Object3D[] = [];
    function label(
      text: string,
      x: number,
      z: number,
      parent: THREE.Object3D,
      y = 3.2,
    ) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#3f372d";
      ctx.font = "500 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, 128, 42);
      const texture = new THREE.CanvasTexture(canvas),
        s = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
          }),
        );
      s.position.set(x, y, z);
      s.scale.set(6, 1.5, 1);
      parent.add(s);
    }
    for (const o of state.objects) {
      const size = dimensions(o),
        group = new THREE.Group();
      scene.add(group);
      group.position.set(o.x / 10, 0, -o.y / 10);
      group.rotation.y = (o.rotation * Math.PI) / 180;
      const h = o.capacity
        ? 2.5
        : o.kind === "stage"
          ? 2
          : o.kind === "dance floor"
            ? 0.12
            : 1;
      let top: THREE.Mesh;
      if (o.kind === "serpentine") {
        const shape = new THREE.Shape(),
          half = size.depth * 0.16;
        for (let i = 0; i <= 64; i++) {
          const p = serpentCenter(i / 64, size.width, size.depth);
          i ? shape.lineTo(p.x, p.y + half) : shape.moveTo(p.x, p.y + half);
        }
        for (let i = 64; i >= 0; i--) {
          const p = serpentCenter(i / 64, size.width, size.depth);
          shape.lineTo(p.x, p.y - half);
        }
        shape.closePath();
        top = mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.25,
            bevelEnabled: false,
          }),
          style.linen,
          group,
        );
        top.rotation.x = -Math.PI / 2;
        top.position.y = h;
      } else if (["round", "oval", "cocktail"].includes(o.kind)) {
        top = mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.25, 48),
          style.linen,
          group,
        );
        top.scale.set(size.width, 1, size.depth);
        top.position.y = h;
      } else {
        top = mesh(
          new THREE.BoxGeometry(size.width, 0.25, size.depth),
          o.capacity || o.kind === "dance floor" ? style.linen : "#b7a790",
          group,
        );
        top.position.y = h;
      }
      if (o.capacity) {
        let cloth: THREE.Mesh;
        if (o.kind === "serpentine") {
          const topGeometry = top.geometry as THREE.ExtrudeGeometry;
          cloth = mesh(
            new THREE.ExtrudeGeometry(topGeometry.parameters.shapes, {
              depth: 1.75,
              bevelEnabled: false,
            }),
            style.linen,
            group,
          );
          cloth.rotation.x = -Math.PI / 2;
          cloth.position.y = 0.7;
        } else if (["round", "oval", "cocktail"].includes(o.kind)) {
          cloth = mesh(
            new THREE.CylinderGeometry(0.505, 0.515, 1.75, 48),
            style.linen,
            group,
          );
          cloth.scale.set(size.width, 1, size.depth);
          cloth.position.y = 1.5;
        } else {
          cloth = mesh(
            new THREE.BoxGeometry(size.width + 0.1, 1.75, size.depth + 0.1),
            style.linen,
            group,
          );
          cloth.position.y = 1.5;
        }
        const linenCanvas = document.createElement("canvas");
        linenCanvas.width = 64;
        linenCanvas.height = 64;
        const weave = linenCanvas.getContext("2d")!;
        weave.fillStyle = "#ffffff";
        weave.fillRect(0, 0, 64, 64);
        weave.strokeStyle = "#eeeeee";
        weave.lineWidth = 1;
        for (let t = 0; t < 64; t += 4) {
          weave.beginPath();
          weave.moveTo(t, 0);
          weave.lineTo(t, 64);
          weave.moveTo(0, t);
          weave.lineTo(64, t);
          weave.stroke();
        }
        const fabric = new THREE.CanvasTexture(linenCanvas);
        fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
        fabric.repeat.set(size.width * 2, size.depth * 2);
        for (const fabricMesh of [top, cloth]) {
          const material = fabricMesh.material as THREE.MeshStandardMaterial;
          material.map = fabric;
          material.roughness = 1;
          material.needsUpdate = true;
        }
        const runner = mesh(
          new THREE.BoxGeometry(
            Math.min(1, size.width * 0.2),
            0.03,
            size.depth * 0.8,
          ),
          style.accent,
          group,
        );
        runner.position.y = h + 0.15;
        const vase = mesh(
          new THREE.CylinderGeometry(0.22, 0.3, 0.6, 16),
          style.accent,
          group,
        );
        vase.position.y = h + 0.5;
        for (let f = 0; f < 6; f++) {
          const a = (f * Math.PI) / 3,
            flower = mesh(
              new THREE.SphereGeometry(0.24, 12, 10),
              f % 3 ? style.flower : style.greenery,
              group,
            );
          flower.position.set(
            Math.cos(a) * 0.3,
            h + 0.95 + Math.sin(a) * 0.08,
            Math.sin(a) * 0.3,
          );
        }
        for (const side of [-1, 1]) {
          const candle = mesh(
            new THREE.CylinderGeometry(0.07, 0.07, 0.65, 10),
            "#f5ecd7",
            group,
          );
          candle.position.set(
            side * Math.min(size.width * 0.28, 1),
            h + 0.45,
            0,
          );
          const flame = mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            "#f9d398",
            group,
          );
          flame.position.set(candle.position.x, h + 0.81, 0);
        }

        const leg = mesh(
          new THREE.CylinderGeometry(0.18, 0.25, h, 12),
          "#9b8870",
          group,
        );
        leg.position.y = h / 2;
      }
      top.userData.name = o.name;
      pickable.push(top);
      if (o.kind === "dance floor") {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = style.linen;
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.strokeStyle = style.accent;
        ctx.lineWidth = 8;
        ctx.strokeRect(36, 36, 952, 952);
        ctx.lineWidth = 2;
        ctx.strokeRect(52, 52, 920, 920);
        ctx.fillStyle = inkFor(style.linen);
        ctx.textAlign = "center";
        ctx.font = "italic 150px Georgia,serif";
        ctx.fillText(style.monogram || "Our day", 512, 500);
        ctx.font = "28px sans-serif";
        ctx.fillText(
          `${state.event.partner_one} & ${state.event.partner_two}`,
          512,
          580,
          850,
        );
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const monogram = new THREE.Mesh(
          new THREE.PlaneGeometry(size.width - 0.05, size.depth - 0.05),
          new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 }),
        );
        monogram.rotation.x = -Math.PI / 2;
        monogram.position.y = h + 0.13;
        group.add(monogram);
      } else
        label(o.name, 0, o.capacity ? size.depth * 0.35 : 0, group, h + 1.3);
      for (let i = 0; i < o.capacity; i++) {
        const p = chairPosition(o, i),
          cs = chairSize(o, i),
          g = new THREE.Group();
        g.position.set(p.x, 0, -p.y);
        group.add(g);
        const assignment = state.seats.find(
            (s) => s.table_id === o.id && s.position === i,
          ),
          guest = state.guests.find((a) => a.id === assignment?.guest_id),
          color = guest ? style.accent : "#c5b9a7";
        const seat = mesh(
          new THREE.BoxGeometry(cs.width, 0.18, cs.depth),
          color,
          g,
        );
        seat.position.y = 1.4;
        const back = mesh(new THREE.BoxGeometry(cs.width, 1.2, 0.15), color, g);
        back.position.set(0, 1.9, cs.depth / 2);
        const leg = mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), "#9b8870", g);
        leg.position.y = 0.7;
        seat.userData.name = guest?.name || `${o.name} · Chair ${i + 1}`;
        back.userData.name = seat.userData.name;
        pickable.push(seat, back);
        label(
          guest
            ? guest.name
                .split(" ")
                .map((n) => n[0])
                .join("")
            : String(i + 1),
          0,
          0,
          g,
          2.8,
        );
      }
    }
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    const move = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      setHover(ray.intersectObjects(pickable)[0]?.object.userData.name || "");
    };
    renderer.domElement.addEventListener("pointermove", move);
    const resize = () => {
      const width = el.clientWidth,
        height = el.clientHeight || 480;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    let cameraAnimating = false;
    const render = () => {
      if (!cameraAnimating) renderer.render(scene, camera);
    };
    renderer.compile(scene, camera);
    controls.addEventListener("change", render);
    resize();
    let frame = 0;
    const perspective = camera.position.clone();
    const overhead = new THREE.Vector3(
      w / 2,
      Math.max(d, w / camera.aspect) /
        (2 * Math.tan(THREE.MathUtils.degToRad(22.5))),
      -d / 2 + 0.01,
    );
    const animateCamera = (flat: boolean, done?: () => void) => {
      cancelAnimationFrame(frame);
      const origin = camera.position.clone();
      const destination = flat ? overhead : perspective;
      const originTarget = controls.target.clone();
      const center = new THREE.Vector3(w / 2, 0, -d / 2);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      let start: number | undefined;
      cameraAnimating = true;
      controls.enabled = false;
      const pan = (now: number) => {
        start ??= now;
        const progress = reduced ? 1 : Math.min(1, (now - start) / 900);
        const eased = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(origin, destination, eased);
        controls.target.lerpVectors(originTarget, center, eased);
        controls.update();
        renderer.render(scene, camera);
        if (progress < 1) frame = requestAnimationFrame(pan);
        else {
          cameraAnimating = false;
          controls.enabled = true;
          done?.();
        }
      };
      frame = requestAnimationFrame(pan);
    };
    cameraMove.current = animateCamera;
    if (!entered.current || flatRequested.current) {
      camera.position.copy(overhead);
      controls.update();
      renderer.render(scene, camera);
      if (!flatRequested.current) animateCamera(false);
    }
    entered.current = true;
    ready.current?.();
    return () => {
      cancelAnimationFrame(frame);
      cameraMove.current = null;
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", move);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose();
            m.dispose();
          });
        }
        if (o instanceof THREE.Sprite) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      el.replaceChildren();
    };
  }, [state]);
  useEffect(() => {
    if (returningToPlan) {
      if (cameraMove.current)
        cameraMove.current(true, () => readyCallback.current?.());
      else readyCallback.current?.();
    } else if (entered.current) cameraMove.current?.(false);
  }, [returningToPlan]);
  return (
    <div className="three-view">
      <div ref={host} aria-label="3D reception rendering" />
      {error ? (
        <p role="status">{error}</p>
      ) : (
        <>
          <span className="three-help">
            Drag to orbit · Scroll to zoom · Right-drag to pan
          </span>
          {hover && (
            <span role="status" className="three-tooltip">
              {hover}
            </span>
          )}
        </>
      )}
    </div>
  );
}
