import * as T from '/vendor/three.module.min.js'

const palettes = {
  winter: { sky: 0x1d2d4b, fog: 0x283d5c, ground: 0x9eb3ca, tree: 0x203e4b, light: 0xb7d4ff },
  spring: { sky: 0xb0c6ba, fog: 0xa2b8a8, ground: 0x78964f, tree: 0xdb7aa0, light: 0xffe2bb },
  summer: { sky: 0x73acd5, fog: 0x8cbcd4, ground: 0xe8c18a, tree: 0x438456, light: 0xffe0a5 },
  autumn: { sky: 0x70526a, fog: 0x805966, ground: 0x98724d, tree: 0xb64d31, light: 0xffba80 }
}
const sphere = new T.IcosahedronGeometry(1, 1)
const smooth = new T.SphereGeometry(1, 16, 12)
const box = new T.BoxGeometry(1, 1, 1)
const cylinder = new T.CylinderGeometry(1, 1, 1, 12)
const cone = new T.ConeGeometry(1, 1, 9)
const materials = new Map()

function material(color) {
  if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .88 }))
  return materials.get(color)
}
function model(parent, geometry, color, position, scale) {
  const mesh = new T.Mesh(geometry, typeof color === 'number' ? material(color) : color)
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
function branch(parent, from, to, radius, color) {
  const a = new T.Vector3(...from)
  const b = new T.Vector3(...to)
  const direction = b.clone().sub(a)
  const piece = model(parent, cylinder, color, a.lerp(b, .5).toArray(), [radius, direction.length(), radius])
  piece.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize())
  return piece
}
function randomSource() {
  let seed = 21831
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
}
function tree(world, season, x, z, size, variation) {
  const group = new T.Group()
  world.add(group)
  group.position.set(x, -.2, z)
  group.scale.setScalar(size)
  group.rotation.y = variation * Math.PI * 2
  if (season === 'winter') {
    model(group, cylinder, 0x514047, [0, 1.3, 0], [.15, 2.6, .15])
    for (let i = 0; i < 4; i++) {
      const width = 1.14 - i * .17
      const height = 1.15 + i * .73
      model(group, cone, i % 2 ? 0x264d58 : 0x1d3849, [0, height, 0], [width, 1.65, width])
      model(group, cone, 0xbbccd9, [0, height + .19, 0], [width * .80, 1.31, width * .80])
    }
  } else {
    const pink = [0xd474a2, 0xf18fb5, 0xf1aec5, 0xc65a8a, 0xffb6c7, 0xe383a8]
    const fall = [0xb64d31, 0xd77935, 0xe5a54e, 0x9c3931, 0xc66332, 0xe08d48]
    const colors = season === 'spring' ? pink : fall
    branch(group, [0, 0, 0], [.15, 2.55, .05], .23, 0x624253)
    for (let i = 0; i < 6; i++) {
      const angle = i * 2.399
      const radius = .58 + (i % 3) * .34
      const top = [Math.cos(angle) * radius, 2.55 + .26 * i, Math.sin(angle) * radius]
      branch(group, [.1, 1.35 + i * .16, 0], top, .08, 0x745060)
      model(group, sphere, colors[i], top, [1.05, .73, .91]).rotation.y = angle
    }
  }
}
function tent(world, x, z, color) {
  const tent = new T.Group()
  tent.position.set(x, 0, z)
  tent.rotation.y = .24
  world.add(tent)
  const panel = (direction) => {
    const side = model(tent, box, color, [direction * .55, .79, 0], [.045, 1.93, 2.35])
    side.rotation.z = direction * .61
  }
  panel(-1)
  panel(1)
  const back = new T.Shape()
  back.moveTo(-1.1, 0)
  back.lineTo(1.1, 0)
  back.lineTo(0, 1.61)
  const wall = model(tent, new T.ShapeGeometry(back), new T.MeshStandardMaterial({ color: 0x694943, side: T.DoubleSide }), [0, 0, -1.14], [1, 1, 1])
  wall.castShadow = false
  branch(tent, [0, 0, 1.15], [0, 1.60, 1.15], .032, 0xe4bd83)
  model(tent, box, 0x7e5649, [0, .02, -.08], [1.85, .07, 2])
}
function lantern(world, x, z) {
  model(world, cylinder, 0x443838, [x, .08, z], [.19, .11, .19])
  model(world, cylinder, new T.MeshStandardMaterial({ color: 0xffd391, emissive: 0xffa83e, emissiveIntensity: .7 }), [x, .27, z], [.13, .27, .13])
  model(world, cone, 0x504041, [x, .48, z], [.23, .17, .23])
}
function makeFire(world, random) {
  const fire = new T.Group()
  world.add(fire)
  for (let i = 0; i < 13; i++) {
    const angle = i * Math.PI * 2 / 13
    const stone = model(fire, sphere, i % 2 ? 0x626270 : 0x7d777b,
      [Math.cos(angle) * 1.43, .16, Math.sin(angle) * 1.43], [.35, .28 + random()*.16, .27])
    stone.rotation.y = angle
  }
  model(fire, cylinder, 0x483237, [0, .045, 0], [1.37, .10, 1.37])
  const coal = new T.MeshStandardMaterial({ color: 0x812c1a, emissive: 0xef390b, emissiveIntensity: .38 })
  for (let i = 0; i < 13; i++) {
    const angle = random() * 6.28
    const radius = random() * .93
    model(fire, sphere, coal, [Math.cos(angle) * radius, .13, Math.sin(angle) * radius], [.18, .10, .15])
  }
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3
    const log = branch(fire, [Math.cos(angle) * .99, .21, Math.sin(angle) * .99],
      [Math.cos(angle) * -.40, .32 + (i % 3) * .1, Math.sin(angle) * -.40], .125, i % 2 ? 0x432321 : 0x653628)
    model(log, cylinder, 0x98654a, [0, -.505, 0], [.94, .025, .94])
  }
  const time = { value: 0 }
  const flame = new T.ShaderMaterial({
    uniforms: { time },
    vertexShader: `
      uniform float time;
      varying vec3 localPosition;
      void main() {
        vec3 p = position;
        float h = max(0.0, p.y + 0.5);
        p.xz += vec2(sin(time*4.0+h*7.0), cos(time*3.0+h*9.0))*h*h*.20;
        localPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: `
      varying vec3 localPosition;
      void main() {
        float h = localPosition.y + 0.5;
        vec3 color = mix(vec3(1.0,.94,.53),vec3(1.0,.36,.045),smoothstep(.06,.66,h));
        color = mix(color,vec3(.91,.14,.012),smoothstep(.66,1.0,h));
        gl_FragColor = vec4(color,1.0);
      }`
  })
  const profile = [[0, -.5], [.28, -.48], [.46, -.35], [.43, -.19], [.31, -.02], [.19, .17], [.09, .34], [0, .5]]
  const shape = new T.LatheGeometry(profile.map(([x,y]) => new T.Vector2(x,y)), 20)
  const flames = Array.from({ length: 8 }, (_, i) => {
    const angle = i * 2.399
    const radius = i ? .17 + random() * .48 : 0
    const height = i ? .67 + random() * .96 : 1.9
    const mesh = model(fire, shape, flame, [Math.cos(angle)*radius, .33+height*.5, Math.sin(angle)*radius], [.75, height, .70])
    mesh.rotation.z = Math.sin(angle) * .20
    mesh.rotation.x = Math.cos(angle) * .17
    mesh.castShadow = false
    return { mesh, height, angle }
  })
  const light = new T.PointLight(0xff8239, 58, 15, 2)
  light.position.set(0, 1.12, 0)
  fire.add(light)
  return (seconds) => {
    time.value = seconds
    light.intensity = 53 + Math.sin(seconds * 8) * 9 + Math.sin(seconds * 13) * 4
    for (const { mesh, height, angle } of flames) {
      mesh.scale.y = height * (1 + .14 * Math.sin(seconds * 7 + angle))
      mesh.position.y = .33 + mesh.scale.y * .5
    }
  }
}
function cloth(world, position, colors) {
  const [x, y, z] = position
  model(world, box, colors[0], [x, y, z], [3.3, .07, 2.45])
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 7; column++) {
      if ((row + column) % 2 !== 0) continue
      model(world, box, colors[1], [x + (column-3)*.46, y+.037, z+(row-2)*.48], [.46,.008,.48])
    }
  }
}
function palm(world, x, z, scale) {
  const group = new T.Group()
  group.position.set(x, 0, z)
  group.scale.setScalar(scale)
  world.add(group)
  for (let i = 0; i < 8; i++) branch(group, [i*i*.014,i*.4,0], [(i+1)*(i+1)*.014,(i+1)*.4,0], .20-i*.011, i%2 ? 0xa27450 : 0x916449)
  for (let i = 0; i < 8; i++) {
    const leaf = new T.Group()
    leaf.position.set(.9,3.15,0)
    leaf.rotation.y = i * Math.PI / 4
    group.add(leaf)
    for (let j = 0; j < 4; j++) {
      model(leaf, sphere, i%2 ? 0x467d4a : 0x668c44, [.35+j*.43,.25-Math.pow(j-1,2)*.11,0], [.55,.08,.34-j*.045]).rotation.z = .23-j*.14
    }
  }
}
function setupWorld(season) {
  const scene = new T.Scene()
  const palette = palettes[season]
  scene.background = new T.Color(palette.sky)
  scene.fog = new T.FogExp2(palette.fog, .045)
  scene.add(new T.HemisphereLight(palette.light, 0x705564, season === 'winter' ? 1.15 : 1.65))
  const sun = new T.DirectionalLight(palette.light, season === 'winter' ? 1.35 : 2.15)
  sun.position.set(-5, 9, 4)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, far: 32 })
  sun.shadow.normalBias = .055
  scene.add(sun)
  const world = new T.Group()
  scene.add(world)
  const random = randomSource()
  model(world, box, palette.ground, [0,-.41,-6], [55,.80,53])
  let animateFire
  let animateWater
  if (season === 'summer') {
    const water = new T.PlaneGeometry(75, 30, 64, 42)
    const surface = model(world, water, new T.MeshStandardMaterial({color:0x389faf,roughness:.37,metalness:.15}), [0,.04,-19], [1,1,1])
    surface.rotation.x = -Math.PI / 2
    surface.rotation.z = -.105
    surface.castShadow = false
    const foam = Array.from({ length: 4 }, (_, i) => {
      const band = new T.Group()
      band.rotation.y = -.105
      world.add(band)
      for (let j = 0; j < 22; j++) {
        model(band, sphere, i%2 ? 0xcce6d9 : 0x9fd2c9,
          [j * 1.4 - 15, .105, Math.sin(j*.65+i)*.15], [.65+random()*.20,.022,.09+random()*.10]).castShadow = false
      }
      return band
    })
    animateWater = (time) => {
      const vertices = water.attributes.position
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i)
        const y = vertices.getY(i)
        vertices.setZ(i, .055 * Math.sin(x*.6 + y*1.1 - time*2) + .022*Math.sin(x + time*3))
      }
      vertices.needsUpdate = true
      for (let i = 0; i < foam.length; i++) foam[i].position.z = -5.19 - i*.65 + .36*Math.sin(time*1.3+i*.78)
    }
    palm(world, -4, -1, 1.5)
    palm(world, 5, -4, 1.15)
    palm(world, -6, -4, .98)
    cloth(world, [0, .05, .55], [0xf4d097, 0xd47c61])
  } else {
    for (let i = 0; i < 25; i++) {
      const x = (random()-.5)*31
      const z = -4.7-random()*20
      tree(world, season, x, z, .85 + random()*1.35, random())
    }
    tree(world, season, -4.7, -.8, 1.6, .4)
    tree(world, season, 5.4, -1.8, 1.55, .8)
    for (let i = 0; i < 70; i++) {
      const x = (random()-.5)*23
      const z = (random()-.65)*21
      if (Math.hypot(x,z) < 2.25) continue
      const color = season === 'winter' ? 0xcad7e5 : season === 'spring' ? 0xd997a0 : 0xcf8244
      const size = season === 'winter' ? .13+random()*.45 : .05+random()*.09
      model(world, sphere, color, [x,.02,z], [size, size*.25, size*.72]).rotation.y = random()*6
    }
    if (season === 'spring') {
      cloth(world, [0,.05,.55], [0xf4c3bb, 0xd98594])
      model(world, box, 0xc18a5c, [-1.01,.22,.14], [.64,.32,.43])
      const handle = new T.TorusGeometry(.24,.035,8,24,Math.PI)
      model(world, handle, 0xa46c4e, [-1.01,.39,.14], [1,1,1])
    } else {
      tent(world,-3.4,-2.35,season === 'winter' ? 0xc28e65 : 0xce9c70)
      lantern(world,-2.4,-.8)
      animateFire = makeFire(world, random)
      model(world, box, 0x775341, [0,.09,1.97], [2.88,.18,.75])
      model(world, box, 0x976e52, [0,.184,1.97], [2.82,.022,.69])
      branch(world, [2.65,.15,.78], [3.33,.2,-.99], .23, 0x745148)
      branch(world, [-3.0,.15,1.82], [-2.31,.2,2.82], .20, 0x745148)
    }
  }
  const particles = makeParticles(world, season, random)
  return { scene, world, animate(time) {
    animateFire?.(time)
    animateWater?.(time)
    particles(time)
  } }
}

function makeParticles(world, season, random) {
  if (season === 'summer') return () => {}
  const snow = season === 'winter'
  const geometry = new T.IcosahedronGeometry(1, 0)
  const flakes = new T.InstancedMesh(geometry, new T.MeshBasicMaterial({color: snow ? 0xe3efff : season === 'spring' ? 0xf4adba : 0xe69c55}), 68)
  const sparks = new T.InstancedMesh(geometry, new T.MeshBasicMaterial({color:0xffad53}), snow ? 26 : 0)
  flakes.frustumCulled = false
  sparks.frustumCulled = false
  world.add(flakes, sparks)
  const values = Array.from({length:94}, () => [random(),random(),random(),random()])
  const dummy = new T.Object3D()
  return (time) => {
    values.forEach(([x,y,z,speed], i) => {
      const spark = i >= 68
      if (!snow && spark) return
      const progress = (y + time * (spark ? .45 + speed*.4 : .07 + speed*.05)) % 1
      if (spark) {
        dummy.position.set((x-.5)*(1.5+progress)+Math.sin(time*2+i)*progress*.22,.45+progress*3.3,(z-.5)*(1+progress))
      } else {
        dummy.position.set((x-.5)*20 + Math.sin(time+i)*.45, 7.5-progress*7.5, 5-z*18)
      }
      const radius = spark ? .035*(1-progress)+.008 : .026+speed*.04
      dummy.scale.set(radius, snow ? radius : radius*.4, radius)
      dummy.rotation.set(time+i, i+time*.8, 0)
      dummy.updateMatrix()
      if (spark) sparks.setMatrixAt(i-68,dummy.matrix)
      else flakes.setMatrixAt(i,dummy.matrix)
    })
    flakes.instanceMatrix.needsUpdate = true
    sparks.instanceMatrix.needsUpdate = true
  }
}

function makeFood(world, season, index) {
  const group = new T.Group()
  world.add(group)
  group.position.set(index ? .91 : -.91,.37,1.93)
  const surface = new T.MeshStandardMaterial({ roughness: .79 })
  const base = {
    winter: [0x9d4b58, 0xffeee3], autumn: [0x87442a, 0xf5c753],
    spring: [0xeb394d, 0xf2e7ce], summer: [0x417d50, 0xf2cadc]
  }[season][index]
  surface.color.set(base)
  const raw = new T.Color(base)
  const baked = new T.Color((season === 'winter' ? [0x66382d,0xc98348] : [0x6d3523,0xe2a141])[index])
  const burnt = new T.Color(0x24171a)
  let food
  let opened
  const spots = []
  if (season === 'winter' && index === 0) {
    const geometry = smooth.clone()
    const vertices = geometry.attributes.position
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i)
      const y = vertices.getY(i)
      const z = vertices.getZ(i)
      const irregular = 1 + Math.sin(x*11+y*7+z*4)*.07 + Math.cos(y*14-z*9)*.044
      vertices.setXYZ(i, x*irregular, y*irregular+x*x*.17, z*irregular*(.94+x*.21))
    }
    geometry.computeVertexNormals()
    food = model(group, geometry, surface, [0,0,0], [.37,.16,.18])
    food.rotation.z = -.16
    opened = new T.Group()
    group.add(opened)
    opened.visible = false
    const whiteCenter = new T.MeshStandardMaterial({ color:0xffcb63, roughness:.88 })
    const halfShell = new T.SphereGeometry(1,20,12,0,Math.PI*2,Math.PI/2,Math.PI/2)
    for (const side of [-1,1]) {
      const half = new T.Group()
      half.position.set(side*.215,.015,0)
      half.rotation.set(.58,side*.16,side*.28)
      opened.add(half)
      model(half, halfShell, 0x62392e, [0,0,0], [.239,.158,.174])
      model(half, smooth, 0xe99338, [0,.008,0], [.218,.042,.157])
      model(half, smooth, whiteCenter, [side*.016,.035,.012], [.159,.032,.116])
      for (let i = 0; i < 3; i++) {
        const fiber = model(half, sphere, 0xffdf8a, [(i-1)*.055,.063,.018], [.044,.008,.015])
        fiber.rotation.y = (i-1)*.45
      }
    }
    for (let i = 0; i < 7; i++) {
      const x = (i-3)*.067
      const spot = model(group, sphere, 0x44212d, [x,.10,.11+Math.sin(i)*.023], [.026,.012,.026])
      spot.visible = false
      spots.push(spot)
    }
  } else if (season === 'winter' && index === 1) {
    const profile = [[0,-.14],[.12,-.14],[.17,-.1],[.18,-.065],[.18,.07],[.16,.12],[.12,.14],[0,.14]]
    const rounded = new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),24)
    food = model(group, rounded, surface, [0,0,0], [1,1,1])
    food.rotation.z = Math.PI / 2
    branch(group, [0,0,0], [.98,-.06,.11], .024, 0x986c52)
    for (let i = 0; i < 5; i++) {
      const theta = i * 2.399
      const spot = model(group, sphere, 0x934c2c, [(i-2)*.042, .174*Math.cos(theta), .173*Math.sin(theta)], [.044,.024,.027])
      spot.visible = false
      spots.push(spot)
    }
  } else {
    const sizes = { autumn: [[.21,.16,.19],[.13,.36,.14]], spring: [[.16,.20,.16],[.23,.22,.15]], summer: [[.29,.16,.20],[.23,.26,.21]] }
    food = model(group, season === 'spring' && index === 1 ? cone : sphere, surface, [0,0,0], sizes[season][index])
    if (season === 'autumn' && index === 0) {
      model(group, sphere, 0xc58c61, [0,-.076,.09], [.155,.064,.16])
      const seam = model(group, sphere, 0xf1b66d, [0,.14,.02], [.128,.027,.025])
      seam.visible = false
      spots.push(seam)
    }
    if (season === 'autumn' && index === 1) {
      for (let row = 0; row < 7; row++) {
        for (let column = 0; column < 8; column++) {
          const angle = column * Math.PI / 4 + row*.16
          const y = (row-3)*.082
          const radius = .073 + .054*Math.cos((row-3)*.41)
          const kernel = model(group, sphere, column % 3 ? surface : 0xe3a647,
            [Math.cos(angle)*radius,y,Math.sin(angle)*radius], [.032,.047,.035])
          if ((row+column*3)%7 === 0) {
            const spot = model(kernel,sphere,0x633820,[0,.67,0],[.72,.34,.72])
            spot.visible = false
            spots.push(spot)
          }
        }
      }
    }
    if (season === 'spring' && index === 0) model(group, sphere, 0x4f9850, [0,.18,0], [.12,.045,.12])
    if (season === 'spring' && index === 1) model(group, box, 0x344b40, [0,-.14,.09], [.15,.15,.13])
    if (season === 'summer' && index === 0) model(group, sphere, 0xfe5669, [0,.11,0], [.25,.067,.17])
    if (season === 'summer' && index === 1) model(group, cylinder, 0xf0cbc4, [0,-.11,0], [.23,.29,.23])
  }
  const position = new T.Vector3()
  return (state, time, reduced) => {
    const stage = state?.stage ?? 'idle'
    const progress = state?.progress ?? 0
    const inFire = stage === 'cooking'
    group.visible = stage !== 'eaten'
    const homeX = index ? .91 : -.91
    position.set(inFire ? (index ? .62 : -.55) : homeX,
      inFire ? (index && season === 'winter' ? .97 : .24) : stage === 'ready' ? .54 : .29,
      inFire ? (index ? .32 : .67) : 1.93)
    if (reduced) group.position.copy(position)
    else group.position.lerp(position,.12)
    group.rotation.y = (inFire ? -.32 : .2) + (index === 0 ? .25 : -.1)
    group.rotation.x = stage === 'ready' ? -.34 : 0
    if (index === 1) food.rotation.x = inFire && !reduced ? time * .62 : 0
    if (stage === 'burned') surface.color.copy(burnt)
    else surface.color.copy(raw).lerp(baked, stage === 'ready' ? 1 : Math.min(progress,1))
    for (let i = 0; i < spots.length; i++) spots[i].visible = stage === 'ready' || stage === 'burned' || progress > .62+i*.04
    if (opened) {
      opened.visible = stage === 'ready'
      food.visible = !opened.visible
      if (opened.visible) spots.forEach(spot => { spot.visible = false })
    }
  }
}

export function createSeasonScene(element) {
  const canvas = element.querySelector('canvas')
  let renderer
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }) }
  catch {
    element.querySelector('.scene-error').hidden = false
    return { setSeason() {}, setFood() {} }
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const camera = new T.PerspectiveCamera(44, 1, .1, 95)
  const target = new T.Vector3(0, 1.02, -.65)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const worlds = new Map()
  let active
  let foodState = []
  let yaw = .16
  let pitch = .28
  let currentYaw = yaw
  let currentPitch = pitch
  let drag
  const move = (dx, dy) => {
    yaw = T.MathUtils.clamp(yaw + dx, -.65, .78)
    pitch = T.MathUtils.clamp(pitch + dy, .15, .63)
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (drag || event.button !== 0) return
    canvas.setPointerCapture(event.pointerId)
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
  })
  canvas.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return
    move((drag.x-event.clientX)*.006, (event.clientY-drag.y)*.005)
    drag.x = event.clientX
    drag.y = event.clientY
  })
  canvas.addEventListener('lostpointercapture', (event) => {
    if (drag?.id === event.pointerId) drag = undefined
  })
  canvas.addEventListener('keydown', (event) => {
    const direction = {ArrowLeft:[.12,0],ArrowRight:[-.12,0],ArrowUp:[0,.09],ArrowDown:[0,-.09]}[event.key]
    if (!direction) return
    event.preventDefault()
    move(...direction)
  })
  new ResizeObserver(([{ contentRect: { width, height } }]) => {
    if (!width || !height) return
    renderer.setSize(width,height,false)
    camera.aspect = width/height
    camera.fov = camera.aspect < 1 ? 53 : 44
    camera.updateProjectionMatrix()
  }).observe(canvas)

  function render(time) {
    requestAnimationFrame(render)
    if (!active || document.hidden || renderer.getContext().isContextLost()) return
    const reduced = reducedMotion.matches
    const seconds = reduced ? 0 : time/1000
    const ease = reduced ? 1 : .095
    currentYaw += (yaw-currentYaw)*ease
    currentPitch += (pitch-currentPitch)*ease
    const radius = camera.aspect < 1 ? 8.7 : 7.75
    const horizontal = radius*Math.cos(currentPitch)
    camera.position.set(Math.sin(currentYaw)*horizontal, target.y+Math.sin(currentPitch)*radius, Math.cos(currentYaw)*horizontal+target.z)
    camera.lookAt(target)
    active.animate(seconds)
    active.foods.forEach((update,index) => update(foodState[index], seconds, reduced))
    renderer.render(active.scene,camera)
  }
  requestAnimationFrame(render)
  return {
    setSeason(season) {
      if (!worlds.has(season)) {
        const world = setupWorld(season)
        world.foods = [0,1].map(index => makeFood(world.world,season,index))
        worlds.set(season,world)
      }
      active = worlds.get(season)
      foodState = []
    },
    setFood(index, state) { foodState[index] = state }
  }
}
