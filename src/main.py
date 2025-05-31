import os
import sys
import uuid
import requests
import json
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
import pytesseract
import logging
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de caminhos
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # DON'T CHANGE THIS !!!

# Inicialização do app Flask
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Limite de 5MB para uploads
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Configuração da API Maritaca
MARITACA_API_URL = "https://chat.maritaca.ai/api/chat/completions"
MARITACA_API_KEY = os.getenv('MARITACA_API_KEY', '')  # Obter chave da API de variável de ambiente

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar pasta de uploads se não existir
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Função para verificar extensões permitidas
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Função para chamar a API Maritaca
def call_maritaca_api(text):
    if not MARITACA_API_KEY:
        logger.error("Chave da API Maritaca não configurada")
        return {"error": "Chave da API Maritaca não configurada"}, 500
    
    try:
        # Preparar o payload para a API Maritaca
        payload = {
            "model": "sabia-3",  # Modelo da Maritaca
            "messages": [
                {
                    "role": "system",
                    "content": "Você é um assistente especializado em analisar textos extraídos de imagens. Forneça respostas claras e informativas sobre o conteúdo."
                },
                {
                    "role": "user",
                    "content": f"Analise o seguinte texto extraído de uma imagem usando OCR:\n\n{text}"
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        # Configurar headers com a chave da API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Key {MARITACA_API_KEY}"
        }
        
        # Fazer a requisição para a API
        logger.info("Enviando requisição para a API Maritaca")
        response = requests.post(
            MARITACA_API_URL,
            headers=headers,
            data=json.dumps(payload),
            timeout=30  # Timeout de 30 segundos
        )
        
        # Verificar resposta
        response.raise_for_status()  # Lança exceção para códigos de erro HTTP
        
        # Processar resposta
        api_response = response.json()
        logger.info("Resposta recebida da API Maritaca")
        
        # Extrair o conteúdo da resposta
        if "choices" in api_response and len(api_response["choices"]) > 0:
            content = api_response["choices"][0]["message"]["content"]
            return {"success": True, "response": content}, 200
        else:
            logger.warning("Formato de resposta inesperado da API Maritaca")
            return {"error": "Formato de resposta inesperado da API"}, 500
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro na requisição para a API Maritaca: {str(e)}")
        return {"error": f"Erro na comunicação com a API Maritaca: {str(e)}"}, 500
    except json.JSONDecodeError:
        logger.error("Erro ao decodificar resposta JSON da API Maritaca")
        return {"error": "Erro ao processar resposta da API"}, 500
    except Exception as e:
        logger.error(f"Erro inesperado ao chamar a API Maritaca: {str(e)}")
        return {"error": f"Erro inesperado: {str(e)}"}, 500

# Rota para servir arquivos estáticos
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Rota para upload e processamento de imagem
@app.route('/api/process-image', methods=['POST'])
def process_image():
    # Verificar se há arquivo na requisição
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    # Verificar se o arquivo tem nome
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    # Verificar se o arquivo é permitido
    if not allowed_file(file.filename):
        return jsonify({'error': 'Formato de arquivo não permitido. Use PNG, JPG, JPEG ou GIF'}), 400
    
    try:
        # Gerar nome único para o arquivo
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Salvar o arquivo
        file.save(filepath)
        logger.info(f"Arquivo salvo: {filepath}")
        
        # Processar a imagem com OCR
        try:
            # Abrir a imagem com PIL
            image = Image.open(filepath)
            
            # Pré-processamento básico (opcional)
            # image = image.convert('L')  # Converter para escala de cinza
            
            # Extrair texto com pytesseract
            extracted_text = pytesseract.image_to_string(image)
            logger.info(f"Texto extraído com sucesso: {len(extracted_text)} caracteres")
            
            # Verificar se o texto foi extraído
            if not extracted_text.strip():
                # Limpar o arquivo após processamento
                os.remove(filepath)
                logger.info(f"Arquivo removido: {filepath}")
                return jsonify({
                    'success': False,
                    'error': 'Nenhum texto detectado na imagem.',
                    'text': ''
                }), 400
            
            # Chamar a API Maritaca com o texto extraído
            api_result, status_code = call_maritaca_api(extracted_text)
            
            # Limpar o arquivo após processamento
            os.remove(filepath)
            logger.info(f"Arquivo removido: {filepath}")
            
            # Retornar o resultado completo
            if 'success' in api_result and api_result['success']:
                return jsonify({
                    'success': True,
                    'text': extracted_text.strip(),
                    'maritaca_response': api_result['response']
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'text': extracted_text.strip(),
                    'error': api_result.get('error', 'Erro desconhecido na API Maritaca')
                }), status_code
            
        except Exception as e:
            # Limpar o arquivo em caso de erro
            if os.path.exists(filepath):
                os.remove(filepath)
            logger.error(f"Erro no processamento OCR: {str(e)}")
            return jsonify({'error': f'Erro no processamento OCR: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Erro no upload do arquivo: {str(e)}")
        return jsonify({'error': f'Erro no upload do arquivo: {str(e)}'}), 500

# Rota de status para verificar se o servidor está funcionando
@app.route('/api/status', methods=['GET'])
def status():
    api_configured = bool(MARITACA_API_KEY)
    return jsonify({
        'status': 'online',
        'ocr_engine': 'Tesseract',
        'maritaca_api_configured': api_configured,
        'version': '1.0.0'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
