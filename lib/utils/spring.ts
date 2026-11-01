/**
 * Tiny interruptible spring for gesture-driven UI (no animation library needed).
 * Parameterised like Apple's UISpringTimingParameters: dampingRatio + response.
 */

export interface SpringOptions {
  /** 1 = critically damped (no overshoot); <1 bounces. */
  dampingRatio?: number
  /** Seconds to (roughly) reach the target. Not a fixed duration. */
  response?: number
  /** Initial velocity in units/second — hand off the gesture's release velocity here. */
  velocity?: number
}

/** Animates from `from` to `to`, calling onUpdate each frame. Returns a cancel fn. */
export function animateSpring(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  { dampingRatio = 1, response = 0.35, velocity = 0 }: SpringOptions = {},
): () => void {
  const stiffness = (2 * Math.PI / response) ** 2
  const damping = (4 * Math.PI * dampingRatio) / response
  let x = from
  let v = velocity
  let last = performance.now()
  let raf = 0

  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30) // clamp after tab-switch stalls
    last = now
    v += (-stiffness * (x - to) - damping * v) * dt
    x += v * dt
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 5) {
      onUpdate(to)
      return
    }
    onUpdate(x)
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

/** Where a flick would come to rest (Apple's scroll-deceleration projection). */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}
