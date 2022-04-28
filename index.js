(async () => {
  if (!navigator.gpu) {
    console.log("WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.log("Failed to get GPU adapter.");
    return;
  }
  const device = await adapter.requestDevice();

  //
  // Random points input array
  //
  const NUM_POINTS = 15*1000*1000;
  var randomPoints = new Float32Array((NUM_POINTS*2)+1); // +1 for size prefix element
  randomPoints[0] = NUM_POINTS;
  //console.log("randomPoints = ");
  for (var i = 0; i < NUM_POINTS; i += 1) {
    randomPoints[(i*2)+1] = Math.random()
    randomPoints[(i*2)+2] = Math.random()
    //console.log(`  ${randomPoints[(i*2)+1]}, ${randomPoints[(i*2)+2]}, ${ randomPoints[(i*2)+1]*randomPoints[(i*2)+1] + randomPoints[(i*2)+2]*randomPoints[(i*2)+2] }`)
  }
  const gpuBufferRandomPoints = device.createBuffer({
    mappedAtCreation: true,
    size: randomPoints.byteLength,
    usage: GPUBufferUsage.STORAGE
  });
  const arrayBufferRandomPoints = gpuBufferRandomPoints.getMappedRange();
  new Float32Array(arrayBufferRandomPoints).set(randomPoints);
  gpuBufferRandomPoints.unmap();

  //
  // inCircle array of booleans for each point
  //
  const inCircleBufferSize = Float32Array.BYTES_PER_ELEMENT * NUM_POINTS;
  const inCircleBuffer = device.createBuffer({
    size: inCircleBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  //
  // Compute shader code
  //
  const shaderModule = device.createShaderModule({
    code: `
      struct PointsArray {
        size : f32,
        values: array<f32>,
      };

      @group(0) @binding(0) var<storage, read> randomPoints : PointsArray;
      @group(0) @binding(1) var<storage, write> inCircleArray : array<f32>;

      @stage(compute)
      @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        // Skip if this execution would be past array bounds
        if (global_id.x >= u32(randomPoints.size)) {
          return;
        }

        var state : u32 = global_id.x;

        // index for both input and output arrays
        let idx = u32(global_id.x);

        // Compute return value
        let x = f32( randomPoints.values[ (idx * 2u) ] );
        let y = f32( randomPoints.values[ (idx * 2u) + 1u] );
        var isInCircle : u32 = 0u;
        if (x*x + y*y <= 1.0) {
          isInCircle = 1u;
        }

        // Store return value in appropriate array el
        inCircleArray[idx] = f32(isInCircle);
      }
    `
  });

  //
  // Pipeline setup
  //
  const computePipeline = device.createComputePipeline({
    compute: {
      module: shaderModule,
      entryPoint: "main"
    }
  });

  //
  // Bind group
  //
  const bindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0 /* index */),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: gpuBufferRandomPoints
        }
      },
      {
        binding: 1,
        resource: {
          buffer: inCircleBuffer
        }
      },
    ]
  });
  
  // Commands submission

  const commandEncoder = device.createCommandEncoder();

  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatch(NUM_POINTS / 256 + 1);
  passEncoder.end();

  // Get a GPU buffer for reading in an unmapped state.
  const gpuInCircleReadBuffer = device.createBuffer({
    size: inCircleBufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  // Encode commands for copying buffer to buffer.
  commandEncoder.copyBufferToBuffer(
    inCircleBuffer /* source buffer */,
    0 /* source offset */,
    gpuInCircleReadBuffer /* destination buffer */,
    0 /* destination offset */,
    inCircleBufferSize /* size */
  );

  // Submit GPU commands.
  const gpuCommands = commandEncoder.finish();
  device.queue.submit([gpuCommands]);

  // Read inCircle buffer
  await gpuInCircleReadBuffer.mapAsync(GPUMapMode.READ);
  const inCircleArrayBuffer = gpuInCircleReadBuffer.getMappedRange();
  const inCircleArr = new Float32Array(inCircleArrayBuffer);
  console.log(inCircleArr);

  var frac = inCircleArr.reduce((accum,val)=>accum+val, 0) / inCircleArr.length;
  outputDisplay.textContent = `pi ~= ${(frac*4).toPrecision(6)}`;
})();

