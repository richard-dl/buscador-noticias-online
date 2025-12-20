const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'NewsCard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Reemplazar el botón IA para que solo se muestre si isVip=true
const oldButton = `        <button
          className="btn-ai"
          onClick={handleGenerateAISummary}
          disabled={loadingAI}
          title="Generar resumen con IA"
        >
          <FiZap size={18} />
          <span>IA</span>
        </button>`;

const newButton = `        {isVip && (
          <button
            className="btn-ai"
            onClick={handleGenerateAISummary}
            disabled={loadingAI}
            title="Generar resumen con IA"
          >
            <FiZap size={18} />
            <span>IA</span>
          </button>
        )}`;

content = content.replace(oldButton, newButton);

// 2. Simplificar modal - quitar los <h4> labels
content = content.replace(
  `                  {/* Título */}
                  <div className="ai-headline">
                    <h4>Título</h4>
                    <h2>{aiSummary.headline}</h2>
                  </div>`,
  `                  {/* Título */}
                  <div className="ai-headline">
                    <h2>{aiSummary.headline}</h2>
                  </div>`
);

content = content.replace(
  `                  {/* Bajada/Copete */}
                  <div className="ai-lead">
                    <h4>Bajada</h4>
                    <p className="lead-text">{aiSummary.lead}</p>
                  </div>`,
  `                  {/* Bajada/Copete */}
                  <div className="ai-lead">
                    <p className="lead-text">{aiSummary.lead}</p>
                  </div>`
);

content = content.replace(
  `                  {/* Cuerpo */}
                  <div className="ai-body">
                    <h4>Contenido</h4>
                    {aiSummary.body.split('\\n\\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>`,
  `                  {/* Cuerpo */}
                  <div className="ai-body">
                    {aiSummary.body.split('\\n\\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>`
);

content = content.replace(
  `                  {/* Puntos clave */}
                  <div className="ai-keypoints">
                    <h4>Puntos clave</h4>
                    <ul>`,
  `                  {/* Puntos clave */}
                  <div className="ai-keypoints">
                    <ul>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ NewsCard.jsx actualizado');
