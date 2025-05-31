# Maritaca Vision - Guia de Execução Local

Este guia explica como executar o aplicativo Maritaca Vision localmente, já que encontramos limitações com dependências nativas (Pillow/PIL) no ambiente de implantação permanente.

## Pré-requisitos

1. Python 3.8 ou superior
2. Tesseract OCR instalado no sistema
3. Uma chave de API válida da Maritaca.ai

## Instalação

1. Clone ou baixe este repositório para sua máquina local

2. Instale o Tesseract OCR:
   - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
   - **Windows**: Baixe o instalador em https://github.com/UB-Mannheim/tesseract/wiki
   - **macOS**: `brew install tesseract`

3. Crie um ambiente virtual Python:
   ```bash
   python -m venv venv
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   ```

4. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

5. Configure sua chave de API da Maritaca:
   - Edite o arquivo `.env` e substitua `sua_chave_api_aqui` pela sua chave real da API Maritaca

## Executando o Aplicativo

1. Ative o ambiente virtual (se ainda não estiver ativo):
   ```bash
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   ```

2. Inicie o servidor Flask:
   ```bash
   cd src
   python main.py
   ```

3. Acesse o aplicativo em seu navegador:
   ```
   http://localhost:5000
   ```

## Uso do Aplicativo

1. Na página inicial, faça upload de uma imagem contendo texto ou use a câmera para capturar uma imagem
2. Clique em "Processar Imagem"
3. O aplicativo extrairá o texto da imagem usando OCR e enviará para a API Maritaca
4. Os resultados serão exibidos em duas abas:
   - "Texto Extraído": Mostra o texto bruto extraído da imagem
   - "Resposta da Maritaca": Mostra a análise do texto pela API Maritaca

## Solução de Problemas

- **Erro de OCR**: Verifique se o Tesseract está instalado corretamente e acessível no PATH do sistema
- **Erro de API**: Verifique se sua chave da API Maritaca está configurada corretamente no arquivo `.env`
- **Imagens não processadas**: Certifique-se de que a imagem contém texto legível e está em um formato suportado (JPG, PNG, GIF)

## Estrutura do Projeto

- `src/main.py`: Ponto de entrada do aplicativo Flask
- `src/static/`: Arquivos estáticos (HTML, CSS, JavaScript)
- `.env`: Arquivo de configuração para a chave da API Maritaca
- `requirements.txt`: Lista de dependências Python

## Notas Adicionais

Este aplicativo foi projetado para demonstrar a integração entre OCR e a API Maritaca. Para uso em produção, considere:

1. Implementar autenticação de usuários
2. Adicionar cache para reduzir chamadas à API
3. Melhorar o pré-processamento de imagens para resultados de OCR mais precisos
4. Implementar limites de taxa e tamanho para uploads de imagens
