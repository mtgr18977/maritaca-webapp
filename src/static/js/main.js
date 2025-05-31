// Atualização do JavaScript para integração com o backend Flask
// Autor: Manus
// Data: 31/05/2025

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    const removeImageBtn = document.getElementById('remove-image');
    const processButton = document.getElementById('process-button');
    const cameraButton = document.getElementById('camera-button');
    const cameraModal = document.getElementById('camera-modal');
    const closeCamera = document.getElementById('close-camera');
    const cameraStream = document.getElementById('camera-stream');
    const cameraCanvas = document.getElementById('camera-canvas');
    const captureButton = document.getElementById('capture-button');
    const retakeButton = document.getElementById('retake-button');
    const usePhotoButton = document.getElementById('use-photo-button');
    const uploadSection = document.getElementById('upload-section');
    const processingSection = document.getElementById('processing-section');
    const resultSection = document.getElementById('result-section');
    const statusMessage = document.getElementById('status-message');
    const progressFill = document.querySelector('.progress-fill');
    const ocrResult = document.getElementById('ocr-result');
    const apiResult = document.getElementById('api-result');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const copyButton = document.getElementById('copy-button');
    const newQueryButton = document.getElementById('new-query-button');

    // Variáveis de estado
    let selectedFile = null;
    let stream = null;
    let activeTab = 'extracted-text';

    // Funções de manipulação de arquivos
    function handleFileSelect(file) {
        if (!file) return;
        
        // Verificar tipo de arquivo
        if (!file.type.match('image.*')) {
            alert('Por favor, selecione uma imagem válida (JPG, PNG, GIF).');
            return;
        }
        
        // Verificar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem é muito grande. O tamanho máximo é 5MB.');
            return;
        }
        
        selectedFile = file;
        
        // Exibir pré-visualização
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.classList.remove('hidden');
            processButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // Event Listeners para upload de arquivo
    fileInput.addEventListener('change', function() {
        handleFileSelect(this.files[0]);
    });

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFileSelect(file);
    });

    // Remover imagem
    removeImageBtn.addEventListener('click', function() {
        previewContainer.classList.add('hidden');
        previewImage.src = '#';
        fileInput.value = '';
        selectedFile = null;
        processButton.disabled = true;
    });

    // Funcionalidade da câmera
    cameraButton.addEventListener('click', openCamera);
    closeCamera.addEventListener('click', closeWebcam);
    captureButton.addEventListener('click', capturePhoto);
    retakeButton.addEventListener('click', retakePhoto);
    usePhotoButton.addEventListener('click', usePhoto);

    function openCamera() {
        cameraModal.classList.remove('hidden');
        
        // Solicitar acesso à câmera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function(videoStream) {
                    stream = videoStream;
                    cameraStream.srcObject = stream;
                    captureButton.classList.remove('hidden');
                    retakeButton.classList.add('hidden');
                    usePhotoButton.classList.add('hidden');
                    cameraStream.classList.remove('hidden');
                    cameraCanvas.classList.add('hidden');
                })
                .catch(function(error) {
                    alert('Erro ao acessar a câmera: ' + error.message);
                    closeWebcam();
                });
        } else {
            alert('Seu navegador não suporta acesso à câmera.');
            closeWebcam();
        }
    }

    function closeWebcam() {
        cameraModal.classList.add('hidden');
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            stream = null;
        }
    }

    function capturePhoto() {
        const context = cameraCanvas.getContext('2d');
        
        // Definir dimensões do canvas para corresponder ao vídeo
        cameraCanvas.width = cameraStream.videoWidth;
        cameraCanvas.height = cameraStream.videoHeight;
        
        // Desenhar o frame atual do vídeo no canvas
        context.drawImage(cameraStream, 0, 0, cameraCanvas.width, cameraCanvas.height);
        
        // Mostrar canvas e esconder vídeo
        cameraStream.classList.add('hidden');
        cameraCanvas.classList.remove('hidden');
        
        // Atualizar botões
        captureButton.classList.add('hidden');
        retakeButton.classList.remove('hidden');
        usePhotoButton.classList.remove('hidden');
    }

    function retakePhoto() {
        // Voltar para o modo de captura
        cameraStream.classList.remove('hidden');
        cameraCanvas.classList.add('hidden');
        
        // Atualizar botões
        captureButton.classList.remove('hidden');
        retakeButton.classList.add('hidden');
        usePhotoButton.classList.add('hidden');
    }

    function usePhoto() {
        // Converter canvas para blob/file
        cameraCanvas.toBlob(function(blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            handleFileSelect(file);
            closeWebcam();
        }, 'image/jpeg', 0.95);
    }

    // Processamento da imagem (integração real com o backend)
    processButton.addEventListener('click', function() {
        if (!selectedFile) return;
        
        // Esconder seção de upload e mostrar processamento
        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        
        // Iniciar animação de progresso
        let progress = 0;
        const interval = setInterval(function() {
            progress += 5;
            if (progress > 95) progress = 95; // Manter em 95% até resposta real
            progressFill.style.width = progress + '%';
            
            if (progress <= 30) {
                statusMessage.textContent = "Enviando imagem...";
            } else if (progress <= 60) {
                statusMessage.textContent = "Extraindo texto com OCR...";
            } else if (progress <= 90) {
                statusMessage.textContent = "Consultando API Maritaca...";
            } else {
                statusMessage.textContent = "Finalizando...";
            }
        }, 200);
        
        // Criar FormData para envio do arquivo
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Enviar para o backend
        fetch('/api/process-image', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            clearInterval(interval);
            progressFill.style.width = '100%';
            
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erro no processamento da imagem');
                });
            }
            return response.json();
        })
        .then(data => {
            // Processar resposta bem-sucedida
            setTimeout(() => {
                // Preencher resultados
                ocrResult.textContent = data.text || "Nenhum texto detectado na imagem.";
                apiResult.innerHTML = data.maritaca_response || "Sem resposta da API Maritaca.";
                
                // Mostrar seção de resultados
                processingSection.classList.add('hidden');
                resultSection.classList.remove('hidden');
            }, 500);
        })
        .catch(error => {
            clearInterval(interval);
            console.error('Erro:', error);
            
            // Mostrar erro na interface
            statusMessage.textContent = error.message || "Ocorreu um erro no processamento.";
            progressFill.style.width = '0%';
            
            // Adicionar botão para voltar
            const backButton = document.createElement('button');
            backButton.className = 'btn primary';
            backButton.textContent = 'Voltar';
            backButton.onclick = function() {
                processingSection.classList.add('hidden');
                uploadSection.classList.remove('hidden');
            };
            
            // Limpar e adicionar botão
            const progressContainer = document.querySelector('.progress-container');
            progressContainer.appendChild(document.createElement('br'));
            progressContainer.appendChild(document.createElement('br'));
            progressContainer.appendChild(backButton);
        });
    });

    // Alternar entre abas
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Atualizar botões
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Atualizar conteúdo
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            
            activeTab = tab;
        });
    });

    // Copiar texto
    copyButton.addEventListener('click', function() {
        const textToCopy = activeTab === 'extracted-text' ? 
            ocrResult.textContent : 
            apiResult.innerText;
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                // Feedback visual temporário
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Erro ao copiar texto: ', err);
                alert('Não foi possível copiar o texto. Por favor, tente novamente.');
            });
    });

    // Nova consulta
    newQueryButton.addEventListener('click', function() {
        // Resetar estado
        selectedFile = null;
        fileInput.value = '';
        previewImage.src = '#';
        previewContainer.classList.add('hidden');
        processButton.disabled = true;
        
        // Voltar para a tela inicial
        resultSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        
        // Resetar progresso
        progressFill.style.width = '0%';
    });

    // Verificar status do servidor ao carregar
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            console.log('Status do servidor:', data);
            if (!data.maritaca_api_configured) {
                console.warn('API Maritaca não configurada no servidor!');
            }
        })
        .catch(error => {
            console.error('Erro ao verificar status do servidor:', error);
        });
});
