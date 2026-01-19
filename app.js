/**
 * Editor de Paleta de Colores
 * Aplicación para detectar y modificar colores en imágenes
 */

class ColorPaletteEditor {
    constructor() {
        // Elementos del DOM
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.workspace = document.getElementById('workspace');
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.paletteContainer = document.getElementById('paletteContainer');
        this.colorEditor = document.getElementById('colorEditor');
        this.historySection = document.getElementById('historySection');
        this.historyList = document.getElementById('historyList');

        // Controles
        this.colorCountSlider = document.getElementById('colorCount');
        this.colorCountValue = document.getElementById('colorCountValue');
        this.toleranceSlider = document.getElementById('tolerance');
        this.toleranceValue = document.getElementById('toleranceValue');
        this.newColorPicker = document.getElementById('newColorPicker');
        this.newColorHex = document.getElementById('newColorHex');

        // Controles de limpieza
        this.smoothingSlider = document.getElementById('smoothingLevel');
        this.smoothingValue = document.getElementById('smoothingValue');
        this.ditherSlider = document.getElementById('ditherAmount');
        this.ditherValue = document.getElementById('ditherValue');
        this.previewCleanBtn = document.getElementById('previewCleanBtn');
        this.applyCleanBtn = document.getElementById('applyCleanBtn');

        // Previews
        this.originalColorPreview = document.getElementById('originalColorPreview');
        this.originalColorHex = document.getElementById('originalColorHex');

        // Botones
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.applyBtn = document.getElementById('applyBtn');
        this.cancelBtn = document.getElementById('cancelBtn');

        // Estado
        this.originalImageData = null;
        this.currentImageData = null;
        this.previewImageData = null;
        this.cleanPreviewImageData = null;
        this.selectedColor = null;
        this.history = [];
        this.fileName = 'imagen';
        this.currentPalette = [];

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Eventos de drag & drop
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', () => this.handleDragLeave());
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Controles de paleta
        this.colorCountSlider.addEventListener('input', (e) => {
            this.colorCountValue.textContent = e.target.value;
        });
        this.colorCountSlider.addEventListener('change', () => this.extractPalette());

        // Controles de tolerancia
        this.toleranceSlider.addEventListener('input', (e) => {
            this.toleranceValue.textContent = e.target.value;
        });

        // Color picker
        this.newColorPicker.addEventListener('input', (e) => {
            this.newColorHex.textContent = e.target.value.toUpperCase();
        });

        // Botones
        this.resetBtn.addEventListener('click', () => this.resetImage());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.previewBtn.addEventListener('click', () => this.previewColorChange());
        this.applyBtn.addEventListener('click', () => this.applyColorChange());
        this.cancelBtn.addEventListener('click', () => this.cancelColorChange());

        // Controles de limpieza
        this.smoothingSlider.addEventListener('input', (e) => {
            this.smoothingValue.textContent = e.target.value;
        });
        this.ditherSlider.addEventListener('input', (e) => {
            this.ditherValue.textContent = e.target.value + '%';
        });
        this.previewCleanBtn.addEventListener('click', () => this.previewCleanup());
        this.applyCleanBtn.addEventListener('click', () => this.applyCleanup());
    }

    // ==================== Manejo de archivos ====================

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave() {
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    loadImage(file) {
        if (!file.type.match(/image\/(jpeg|png)/)) {
            alert('Por favor, selecciona una imagen JPG o PNG');
            return;
        }

        this.fileName = file.name.replace(/\.[^/.]+$/, '');

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.initCanvas(img);
                this.workspace.style.display = 'block';
                this.extractPalette();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    initCanvas(img) {
        // Ajustar tamaño del canvas
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;

        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }

        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.canvas.style.maxWidth = `${maxWidth}px`;
        this.canvas.style.maxHeight = `${maxHeight}px`;

        this.ctx.drawImage(img, 0, 0);
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history = [];
        this.updateHistoryUI();
    }

    // ==================== Extracción de paleta ====================

    extractPalette() {
        if (!this.currentImageData) return;

        const colors = this.getColorsFromImage();
        const numColors = parseInt(this.colorCountSlider.value);
        const palette = this.kMeansClustering(colors, numColors);

        this.currentPalette = palette;
        this.renderPalette(palette);
    }

    getColorsFromImage() {
        const data = this.currentImageData.data;
        const colors = [];
        const step = Math.max(1, Math.floor(data.length / 4 / 10000)); // Sample para rendimiento

        for (let i = 0; i < data.length; i += 4 * step) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Ignorar píxeles transparentes
            if (a > 128) {
                colors.push({ r, g, b });
            }
        }

        return colors;
    }

    kMeansClustering(colors, k) {
        if (colors.length === 0) return [];

        // Inicializar centroides con k-means++
        let centroids = this.initializeCentroids(colors, k);
        const maxIterations = 20;

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Asignar colores a clusters
            const clusters = Array.from({ length: k }, () => []);

            for (const color of colors) {
                let minDist = Infinity;
                let closestCluster = 0;

                for (let i = 0; i < centroids.length; i++) {
                    const dist = this.colorDistance(color, centroids[i]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestCluster = i;
                    }
                }

                clusters[closestCluster].push(color);
            }

            // Calcular nuevos centroides
            const newCentroids = clusters.map((cluster, i) => {
                if (cluster.length === 0) return centroids[i];

                const sum = cluster.reduce(
                    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
                    { r: 0, g: 0, b: 0 }
                );

                return {
                    r: Math.round(sum.r / cluster.length),
                    g: Math.round(sum.g / cluster.length),
                    b: Math.round(sum.b / cluster.length)
                };
            });

            // Verificar convergencia
            let converged = true;
            for (let i = 0; i < k; i++) {
                if (this.colorDistance(centroids[i], newCentroids[i]) > 1) {
                    converged = false;
                    break;
                }
            }

            centroids = newCentroids;
            if (converged) break;
        }

        // Calcular porcentaje de cada color
        const data = this.currentImageData.data;
        const totalPixels = data.length / 4;
        const colorCounts = centroids.map(() => 0);

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;

            const color = { r: data[i], g: data[i + 1], b: data[i + 2] };
            let minDist = Infinity;
            let closestIdx = 0;

            for (let j = 0; j < centroids.length; j++) {
                const dist = this.colorDistance(color, centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = j;
                }
            }

            colorCounts[closestIdx]++;
        }

        // Crear resultado con porcentajes
        const result = centroids.map((c, i) => ({
            ...c,
            hex: this.rgbToHex(c.r, c.g, c.b),
            percentage: ((colorCounts[i] / totalPixels) * 100).toFixed(1)
        }));

        // Ordenar por porcentaje (mayor primero)
        result.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

        return result;
    }

    initializeCentroids(colors, k) {
        const centroids = [];
        const usedIndices = new Set();

        // Primer centroide aleatorio
        const firstIdx = Math.floor(Math.random() * colors.length);
        centroids.push({ ...colors[firstIdx] });
        usedIndices.add(firstIdx);

        // k-means++ para el resto
        while (centroids.length < k) {
            const distances = colors.map((color, idx) => {
                if (usedIndices.has(idx)) return 0;

                let minDist = Infinity;
                for (const centroid of centroids) {
                    const dist = this.colorDistance(color, centroid);
                    if (dist < minDist) minDist = dist;
                }
                return minDist * minDist;
            });

            const totalDist = distances.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalDist;

            for (let i = 0; i < colors.length; i++) {
                random -= distances[i];
                if (random <= 0) {
                    centroids.push({ ...colors[i] });
                    usedIndices.add(i);
                    break;
                }
            }
        }

        return centroids;
    }

    colorDistance(c1, c2) {
        // Distancia euclidiana en espacio RGB
        const dr = c1.r - c2.r;
        const dg = c1.g - c2.g;
        const db = c1.b - c2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // ==================== Renderizado de paleta ====================

    renderPalette(palette) {
        this.paletteContainer.innerHTML = '';

        palette.forEach((color) => {
            const item = document.createElement('div');
            item.className = 'color-item';
            item.innerHTML = `
                <div class="color-swatch" style="background-color: ${color.hex}"></div>
                <span class="color-hex">${color.hex}</span>
                <span class="color-percentage">${color.percentage}%</span>
            `;

            item.addEventListener('click', () => this.selectColor(color, item));
            this.paletteContainer.appendChild(item);
        });
    }

    selectColor(color, element) {
        // Deseleccionar anteriores
        document.querySelectorAll('.color-item').forEach(el => el.classList.remove('selected'));

        // Seleccionar nuevo
        element.classList.add('selected');
        this.selectedColor = color;

        // Mostrar editor
        this.originalColorPreview.style.backgroundColor = color.hex;
        this.originalColorHex.textContent = color.hex;
        this.newColorPicker.value = color.hex;
        this.newColorHex.textContent = color.hex.toUpperCase();
        this.colorEditor.style.display = 'block';
    }

    // ==================== Reemplazo de colores ====================

    previewColorChange() {
        if (!this.selectedColor) return;

        const tolerance = parseInt(this.toleranceSlider.value);
        const newColor = this.hexToRgb(this.newColorPicker.value);

        // Guardar estado actual para preview
        this.previewImageData = new ImageData(
            new Uint8ClampedArray(this.currentImageData.data),
            this.currentImageData.width,
            this.currentImageData.height
        );

        // Aplicar cambio
        this.replaceColor(
            this.currentImageData,
            this.selectedColor,
            newColor,
            tolerance
        );

        // Mostrar en canvas
        this.ctx.putImageData(this.currentImageData, 0, 0);
    }

    applyColorChange() {
        if (!this.selectedColor) return;

        // Si hay preview activo, ya tenemos los cambios aplicados
        // Si no, aplicamos los cambios
        if (!this.previewImageData) {
            this.previewColorChange();
        }

        // Guardar en historial
        this.history.push({
            imageData: this.previewImageData || new ImageData(
                new Uint8ClampedArray(this.currentImageData.data),
                this.currentImageData.width,
                this.currentImageData.height
            ),
            fromColor: this.selectedColor.hex,
            toColor: this.newColorPicker.value.toUpperCase()
        });

        // Actualizar estado actual
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.previewImageData = null;

        // Actualizar UI
        this.updateHistoryUI();
        this.extractPalette();
        this.colorEditor.style.display = 'none';
        this.selectedColor = null;
    }

    cancelColorChange() {
        // Restaurar estado anterior al preview
        if (this.previewImageData) {
            this.currentImageData = this.previewImageData;
            this.ctx.putImageData(this.currentImageData, 0, 0);
            this.previewImageData = null;
        }

        this.colorEditor.style.display = 'none';
        this.selectedColor = null;
        document.querySelectorAll('.color-item').forEach(el => el.classList.remove('selected'));
    }

    replaceColor(imageData, targetColor, newColor, tolerance) {
        const data = imageData.data;
        const toleranceSquared = tolerance * tolerance * 3; // Para comparación RGB

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Ignorar píxeles transparentes
            if (a < 128) continue;

            // Calcular distancia al color objetivo
            const dr = r - targetColor.r;
            const dg = g - targetColor.g;
            const db = b - targetColor.b;
            const distSquared = dr * dr + dg * dg + db * db;

            if (distSquared <= toleranceSquared) {
                // Calcular factor de mezcla basado en distancia
                const factor = 1 - Math.sqrt(distSquared) / (tolerance * Math.sqrt(3));

                // Aplicar nuevo color con mezcla suave
                data[i] = Math.round(r + (newColor.r - targetColor.r) * factor);
                data[i + 1] = Math.round(g + (newColor.g - targetColor.g) * factor);
                data[i + 2] = Math.round(b + (newColor.b - targetColor.b) * factor);
            }
        }
    }

    // ==================== Limpieza de ruido ====================

    previewCleanup() {
        if (!this.currentImageData || this.currentPalette.length === 0) return;

        // Guardar estado actual para preview
        this.cleanPreviewImageData = new ImageData(
            new Uint8ClampedArray(this.currentImageData.data),
            this.currentImageData.width,
            this.currentImageData.height
        );

        // Crear copia para trabajar
        const workingData = new ImageData(
            new Uint8ClampedArray(this.currentImageData.data),
            this.currentImageData.width,
            this.currentImageData.height
        );

        const smoothingLevel = parseInt(this.smoothingSlider.value);
        const ditherAmount = parseInt(this.ditherSlider.value) / 100;

        // Aplicar suavizado si es necesario
        if (smoothingLevel > 0) {
            this.applyGaussianBlur(workingData, smoothingLevel);
        }

        // Posterizar la imagen
        this.posterizeImage(workingData, this.currentPalette, ditherAmount);

        // Mostrar en canvas
        this.ctx.putImageData(workingData, 0, 0);
    }

    applyCleanup() {
        if (!this.currentImageData || this.currentPalette.length === 0) return;

        // Si no hay preview, generar los cambios
        if (!this.cleanPreviewImageData) {
            this.previewCleanup();
        }

        // Guardar en historial
        this.history.push({
            imageData: this.cleanPreviewImageData,
            fromColor: 'Imagen con ruido',
            toColor: 'Imagen limpia'
        });

        // Actualizar estado actual
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.cleanPreviewImageData = null;

        // Actualizar UI
        this.updateHistoryUI();
        this.extractPalette();
    }

    applyGaussianBlur(imageData, radius) {
        const { width, height, data } = imageData;
        const tempData = new Uint8ClampedArray(data);

        // Kernel gaussiano simple basado en el radio
        const kernelSize = radius * 2 + 1;
        const kernel = this.generateGaussianKernel(kernelSize);

        // Aplicar blur horizontal
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, weightSum = 0;

                for (let kx = -radius; kx <= radius; kx++) {
                    const px = Math.min(Math.max(x + kx, 0), width - 1);
                    const idx = (y * width + px) * 4;
                    const weight = kernel[kx + radius];

                    r += tempData[idx] * weight;
                    g += tempData[idx + 1] * weight;
                    b += tempData[idx + 2] * weight;
                    weightSum += weight;
                }

                const idx = (y * width + x) * 4;
                data[idx] = r / weightSum;
                data[idx + 1] = g / weightSum;
                data[idx + 2] = b / weightSum;
            }
        }

        // Copiar para segunda pasada
        tempData.set(data);

        // Aplicar blur vertical
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, weightSum = 0;

                for (let ky = -radius; ky <= radius; ky++) {
                    const py = Math.min(Math.max(y + ky, 0), height - 1);
                    const idx = (py * width + x) * 4;
                    const weight = kernel[ky + radius];

                    r += tempData[idx] * weight;
                    g += tempData[idx + 1] * weight;
                    b += tempData[idx + 2] * weight;
                    weightSum += weight;
                }

                const idx = (y * width + x) * 4;
                data[idx] = r / weightSum;
                data[idx + 1] = g / weightSum;
                data[idx + 2] = b / weightSum;
            }
        }
    }

    generateGaussianKernel(size) {
        const kernel = [];
        const sigma = size / 6;
        const mean = (size - 1) / 2;

        for (let x = 0; x < size; x++) {
            kernel.push(Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2)));
        }

        return kernel;
    }

    posterizeImage(imageData, palette, ditherAmount) {
        const { width, height, data } = imageData;

        // Crear array de errores para dithering Floyd-Steinberg
        const errors = ditherAmount > 0 ?
            Array.from({ length: height }, () =>
                Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
            ) : null;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Ignorar píxeles transparentes
                if (data[idx + 3] < 128) continue;

                // Obtener color actual (con error de dithering si aplica)
                let r = data[idx];
                let g = data[idx + 1];
                let b = data[idx + 2];

                if (errors && ditherAmount > 0) {
                    r = Math.max(0, Math.min(255, r + errors[y][x].r * ditherAmount));
                    g = Math.max(0, Math.min(255, g + errors[y][x].g * ditherAmount));
                    b = Math.max(0, Math.min(255, b + errors[y][x].b * ditherAmount));
                }

                // Encontrar el color más cercano en la paleta
                let minDist = Infinity;
                let closestColor = palette[0];

                for (const color of palette) {
                    const dr = r - color.r;
                    const dg = g - color.g;
                    const db = b - color.b;
                    const dist = dr * dr + dg * dg + db * db;

                    if (dist < minDist) {
                        minDist = dist;
                        closestColor = color;
                    }
                }

                // Aplicar color de la paleta
                data[idx] = closestColor.r;
                data[idx + 1] = closestColor.g;
                data[idx + 2] = closestColor.b;

                // Calcular y distribuir error si hay dithering
                if (errors && ditherAmount > 0) {
                    const errorR = r - closestColor.r;
                    const errorG = g - closestColor.g;
                    const errorB = b - closestColor.b;

                    // Floyd-Steinberg dithering distribution
                    if (x + 1 < width) {
                        errors[y][x + 1].r += errorR * 7 / 16;
                        errors[y][x + 1].g += errorG * 7 / 16;
                        errors[y][x + 1].b += errorB * 7 / 16;
                    }
                    if (y + 1 < height) {
                        if (x > 0) {
                            errors[y + 1][x - 1].r += errorR * 3 / 16;
                            errors[y + 1][x - 1].g += errorG * 3 / 16;
                            errors[y + 1][x - 1].b += errorB * 3 / 16;
                        }
                        errors[y + 1][x].r += errorR * 5 / 16;
                        errors[y + 1][x].g += errorG * 5 / 16;
                        errors[y + 1][x].b += errorB * 5 / 16;
                        if (x + 1 < width) {
                            errors[y + 1][x + 1].r += errorR * 1 / 16;
                            errors[y + 1][x + 1].g += errorG * 1 / 16;
                            errors[y + 1][x + 1].b += errorB * 1 / 16;
                        }
                    }
                }
            }
        }
    }

    // ==================== Historial ====================

    updateHistoryUI() {
        if (this.history.length === 0) {
            this.historySection.style.display = 'none';
            return;
        }

        this.historySection.style.display = 'block';
        this.historyList.innerHTML = '';

        this.history.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-colors">
                    <div class="history-swatch" style="background-color: ${entry.fromColor}"></div>
                    <span class="history-arrow">→</span>
                    <div class="history-swatch" style="background-color: ${entry.toColor}"></div>
                </div>
                <span class="history-info">${entry.fromColor} → ${entry.toColor}</span>
                <button class="btn btn-ghost history-undo" data-index="${index}">Deshacer</button>
            `;

            item.querySelector('.history-undo').addEventListener('click', () => {
                this.undoToState(index);
            });

            this.historyList.appendChild(item);
        });
    }

    undoToState(index) {
        if (index < 0 || index >= this.history.length) return;

        // Restaurar al estado anterior al cambio indicado
        const state = this.history[index];
        this.currentImageData = new ImageData(
            new Uint8ClampedArray(state.imageData.data),
            state.imageData.width,
            state.imageData.height
        );

        // Eliminar este cambio y los siguientes del historial
        this.history = this.history.slice(0, index);

        // Actualizar canvas y UI
        this.ctx.putImageData(this.currentImageData, 0, 0);
        this.updateHistoryUI();
        this.extractPalette();
    }

    // ==================== Reset y descarga ====================

    resetImage() {
        if (!this.originalImageData) return;

        this.currentImageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );

        this.ctx.putImageData(this.currentImageData, 0, 0);
        this.history = [];
        this.updateHistoryUI();
        this.extractPalette();
        this.colorEditor.style.display = 'none';
        this.selectedColor = null;
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = `${this.fileName}_editado.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    // ==================== Utilidades ====================

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new ColorPaletteEditor();
});
