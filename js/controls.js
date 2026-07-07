// First-person movement.
//  Desktop:  ↑/W forward, ↓/S back — speed eases up the longer you hold.
//            ←/→ (or A/D) pan, also with easing.
//            Trackpad two-finger swipe = glide with momentum (wheel events).
//            Mouse drag to look around; click = inspect artwork.
//  Mobile:   one-finger swipe up/down = move, sideways = pan; tap = inspect.
import * as THREE from "three";

const KEY_BASE = 2.3, KEY_MAX = 9.0, KEY_RAMP = 2.3;      // m/s, seconds
const YAW_BASE = 1.15, YAW_MAX = 2.5, YAW_RAMP = 1.3;     // rad/s
const WHEEL_GAIN = 0.021, WHEEL_MAX = 17, WHEEL_DECAY = 2.4;
const WHEEL_YAW_GAIN = 0.0032, WHEEL_YAW_DECAY = 4.5;
const TOUCH_GAIN = 0.028, TOUCH_YAW_GAIN = 0.0062;
const DRAG_LOOK = 0.0031;
const EYE = 1.62;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Controls {
  constructor(dom, spawn, clampMove, onTap) {
    this.dom = dom;
    this.clampMove = clampMove;
    this.onTap = onTap;
    this.pos = spawn.pos.clone().setY(EYE);
    this.yaw = spawn.yaw;
    this.pitch = 0;
    this.enabled = false;

    this.keys = new Set();
    this.holdFwd = 0; this.holdYaw = 0;
    this.keyVel = 0; this.keyYawVel = 0;
    this.glideVel = 0;      // trackpad/touch momentum, m/s
    this.glideYaw = 0;      // rad/s

    this.drag = null;
    this.lastTap = 0;

    this.bind();
  }

  bind() {
    const d = this.dom;
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());

    d.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      // natural trackpad scrolling: fingers forward → deltaY > 0 → move forward
      this.glideVel = THREE.MathUtils.clamp(this.glideVel + e.deltaY * WHEEL_GAIN, -WHEEL_MAX, WHEEL_MAX);
      this.glideYaw += e.deltaX * WHEEL_YAW_GAIN;
    }, { passive: false });

    // pointer: drag to look (mouse) / swipe to move (touch); short = tap
    d.addEventListener("pointerdown", (e) => {
      this.drag = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        x0: e.clientX, y0: e.clientY, t0: performance.now(),
        moved: 0, touch: e.pointerType === "touch",
      };
      d.setPointerCapture(e.pointerId);
    });
    d.addEventListener("pointermove", (e) => {
      if (!this.drag || e.pointerId !== this.drag.id || !this.enabled) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      if (this.drag.touch) {
        // swipe: finger up = forward; finger left = pan left
        this.glideVel = THREE.MathUtils.clamp(this.glideVel - dy * TOUCH_GAIN, -WHEEL_MAX, WHEEL_MAX);
        this.glideYaw += -dx * TOUCH_YAW_GAIN;
      } else {
        this.yaw -= dx * DRAG_LOOK;
        this.pitch = THREE.MathUtils.clamp(this.pitch - dy * DRAG_LOOK, -0.7, 0.7);
      }
    });
    const end = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dt = performance.now() - this.drag.t0;
      if (this.drag.moved < 9 && dt < 450) {
        this.lastTap = performance.now();
        this.onTap((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      }
      this.drag = null;
    };
    d.addEventListener("pointerup", end);
    d.addEventListener("pointercancel", () => (this.drag = null));
    d.addEventListener("contextmenu", (e) => e.preventDefault());
    // fallback for environments that emit click without pointer events
    d.addEventListener("click", (e) => {
      if (performance.now() - this.lastTap < 120) return;
      this.onTap((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    const fwdKey = (k.has("arrowup") || k.has("w") ? 1 : 0) - (k.has("arrowdown") || k.has("s") ? 1 : 0);
    const yawKey = (k.has("arrowleft") || k.has("a") ? 1 : 0) - (k.has("arrowright") || k.has("d") ? 1 : 0);

    // eased keyboard speed: ramps up while held
    this.holdFwd = fwdKey !== 0 ? this.holdFwd + dt : 0;
    const targetV = fwdKey * (KEY_BASE + (KEY_MAX - KEY_BASE) * easeInOut(Math.min(this.holdFwd / KEY_RAMP, 1)));
    this.keyVel += (targetV - this.keyVel) * Math.min(1, dt * (fwdKey ? 7 : 11));

    this.holdYaw = yawKey !== 0 ? this.holdYaw + dt : 0;
    const targetY = yawKey * (YAW_BASE + (YAW_MAX - YAW_BASE) * easeInOut(Math.min(this.holdYaw / YAW_RAMP, 1)));
    this.keyYawVel += (targetY - this.keyYawVel) * Math.min(1, dt * (yawKey ? 8 : 12));

    // glide momentum decay
    this.glideVel *= Math.exp(-dt * WHEEL_DECAY);
    this.glideYaw *= Math.exp(-dt * WHEEL_YAW_DECAY);
    if (Math.abs(this.glideVel) < 0.01) this.glideVel = 0;
    if (Math.abs(this.glideYaw) < 0.001) this.glideYaw = 0;

    this.yaw += (this.keyYawVel + this.glideYaw) * dt;

    const speed = this.keyVel + this.glideVel;
    if (speed !== 0) {
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const next = this.pos.clone().addScaledVector(fwd, speed * dt);
      const clamped = this.clampMove(this.pos, next);
      // bleed off momentum when a wall stops us
      if (clamped.distanceToSquared(next) > 1e-6) this.glideVel *= 0.85;
      this.pos.copy(clamped.setY(EYE));
    }

    // gently level the view when gliding forward
    if (Math.abs(this.pitch) > 0.001 && Math.abs(speed) > 3) {
      this.pitch *= Math.exp(-dt * 0.7);
    }
  }

  applyTo(camera) {
    camera.position.copy(this.pos);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(this.yaw);
    camera.rotateX(this.pitch);
  }

  get isMoving() {
    return Math.abs(this.keyVel) > 0.05 || Math.abs(this.glideVel) > 0.05;
  }
}
