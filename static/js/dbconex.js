const $ = (s) => document.querySelector(s);
    const val = (n) => document.querySelector(`[name="${n}"]`)?.value?.trim() || "";

    async function postJSON(url, data){
      const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
      const j = await r.json();
      if(!r.ok) throw new Error(j.error || 'Error');
      return j;
    }

    function hidePickers(){ $('#dbPicker')?.classList.remove('show'); $('#tblPicker')?.classList.remove('show'); }
    document.addEventListener('click', (e)=>{ if(!e.target.closest('.picker-wrap')) hidePickers(); });

    function renderDbList(dbs){
      const c = $('#dbList'); c.innerHTML = '';
      if(!dbs?.length){ c.innerHTML = '<div class="p-2 text-muted">No hay bases disponibles</div>'; return; }
      dbs.forEach((db)=>{
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'list-group-item list-group-item-action';
        a.textContent = db;
        a.addEventListener('click', ()=>{
          document.querySelector('[name="sql_db"]').value = db;
          document.querySelector('[name="sql_table"]').value = '';
          hidePickers();
        });
        c.appendChild(a);
      });
    }

    function renderTablesTree(grouped){
      const el = $('#tablesTree'); el.innerHTML = '';
      const schemas = Object.keys(grouped||{});
      if(!schemas.length){ el.innerHTML = '<div class="p-2 text-muted">No se encontraron tablas.</div>'; return; }

      let html = '';
      schemas.forEach((schema, i)=>{
        html += `
          <div class="accordion-item">
            <h2 class="accordion-header" id="h${i}">
              <button class="accordion-button ${i ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#c${i}">
                <i class="fa-solid fa-folder-tree me-2"></i>${schema}
              </button>
            </h2>
            <div id="c${i}" class="accordion-collapse collapse ${i ? '' : 'show'}">
              <div class="accordion-body p-0">
                <ul class="list-group list-group-flush">`;

        const tables = grouped[schema] || [];
        for(const t of tables){
          html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>${schema}.${t}</span>
              <button type="button" class="btn btn-sm btn-outline-success pick" data-schema="${schema}" data-table="${t}">
                <i class="fa-solid fa-hand-pointer me-1"></i>Seleccionar
              </button>
            </li>`;
        }

        html += `
                </ul>
              </div>
            </div>
          </div>`;
      });

      el.innerHTML = html;

      el.querySelectorAll('.pick').forEach((b)=>{
        b.addEventListener('click', ()=>{
          const s = b.getAttribute('data-schema');
          const t = b.getAttribute('data-table');
          document.querySelector('[name="sql_schema"]').value = s;
          document.querySelector('[name="sql_table"]').value = t;
          hidePickers();
        });
      });
    }

    async function openDbPicker(){
      try{
        const server = val('sql_server');
        const res = await postJSON('/api/sql/probe', server ? { server } : {});
        if(res.server){
          $('#serverProbe').innerHTML = `<i class="fa-solid fa-circle-check"></i> Conectado a: <b>${res.server}</b>`;
        }else{
          $('#serverProbe').innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> No se pudo autodetectar servidor. Ingresa uno manualmente.`;
        }
        renderDbList(res.databases || []);
        $('#dbPicker').classList.add('show');
      }catch(err){
        console.error('probe failed:', err);
        $('#serverProbe').innerHTML = `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>`;
        alert('No se pudo obtener las bases de datos.\n' + err.message);
      }
    }

    async function openTablesPicker(){
      const db = val('sql_db');
      if(!db){ $('#dbPicker').classList.add('show'); return; }
      try{
        const server = val('sql_server');
        const body = server ? { server, database: db } : { database: db };
        const res = await postJSON('/api/sql/tables', body);
        renderTablesTree(res.schemas || {});
        $('#tblPicker').classList.add('show');
      }catch(err){
        console.error('tables failed:', err);
        alert('No se pudieron listar las tablas.\n' + err.message);
      }
    }

    document.getElementById('btnProbeServer')?.addEventListener('click', openDbPicker);
    document.querySelector('[name="sql_db"]')?.addEventListener('click', openDbPicker);
    document.querySelector('[name="sql_table"]')?.addEventListener('click', openTablesPicker);

    document.getElementById('copySql')?.addEventListener('click', async ()=>{
      const t = document.getElementById('sqlBox')?.innerText || '';
      if(!t) return;
      await navigator.clipboard.writeText(t);
      alert('Script SQL copiado.');
    });
    document.getElementById('dlSql')?.addEventListener('click', ()=>{
      const t = document.getElementById('sqlBox')?.innerText || '';
      if(!t) return;
      const blob = new Blob([t], {type:'text/sql;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download='normalizacion_3FN.sql'; document.body.appendChild(a);
      a.click(); URL.revokeObjectURL(url); a.remove();
    });

    document.getElementById('sqlForm')?.addEventListener('submit', (e)=>{
      if(!val('sql_db') || !val('sql_table')){
        e.preventDefault();
        alert('Selecciona Base de datos y Tabla.');
      }
    });

    document.querySelectorAll('input[type="file"]').forEach((inp)=>{
      inp.addEventListener('change', (e)=>{
        const f = e.target.files[0];
        if(f && !f.name.toLowerCase().endsWith('.csv')) e.target.value='';
      });
    });