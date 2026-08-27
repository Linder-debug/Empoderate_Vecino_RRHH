// ============================================================
// EMPODÉRATE VECINO — app.js
// El cliente se llama 'sb' para NO chocar con el global
// 'supabase' que crea la librería (ese fue el error original).
// ============================================================
const SUPABASE_URL = 'https://dmakxahqguexhbmoenyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RNVsXFDbqTieM9YkOG02bw_s5KWaew_';

let sb = null;
let configError = '';

(function initClient() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    configError = '⚠️ No se pudo cargar la librería de Supabase.';
    return;
  }
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    configError = '⚠️ Error al conectar con Supabase: ' + e.message;
  }
})();

function app() {
  return {
    ready: false, session: null, profile: null, configError: configError,
    email: '', password: '', loading: false, errorMsg: '',
    infoMsg: '', forgotLoading: false,
    forgotMode: false,
    showReset: false, newPass: '', newPass2: '', resetMsg: '',
    commissions: [], activities: [], volunteers: [], hours: [], subs: [],
    view: 'vol',
    form: { volunteer_id: '', activity_id: '', entry_date: '', hours: '', description: '' },
    notice: '', noticeType: 'ok',
    today: new Date().toISOString().slice(0, 10),
    fullForm: false,
    personForm: { id: null, nombres: '', apellidos: '', dni: '', commission_id: '', internal_role: '', city: '', birth_date: '', phone: '', email: '', career: '', institution: '', education_level: '', works: '', allergies: '', insurance: '', emergency_contact: '', emergency_relationship: '', emergency_phone: '', hobbies: '', pets: '', admission_date: '', notes: '' },
    certForm: { commission_id: '', person_id: '', start_date: '', end_date: '' },
    certPreview: null,
    pageVol: 1, pageHours: 1, pageSize: 15,
    filterCommission: '',
    filterSearch: '',
    chart: null,

    get myRole() { return this.profile ? this.profile.app_role : ''; },
    get myCommissions() { return (this.profile && this.profile.commission_roles) ? this.profile.commission_roles : []; },
    get myCommission() { return this.myCommissions.length ? this.myCommissions[0] : null; },
    get canWrite() {
      if (this.myRole === 'rrhh') return true;
      return this.myCommissions.some(cr => cr.can_write);
    },
    get activeVols() { return this.volunteers.filter(v => v.status === 'activo'); },

    get pagedVols() { 
      const filtered = this.filteredVols;
      const s = (this.pageVol - 1) * this.pageSize; 
      return filtered.slice(s, s + this.pageSize); 
    },
    get totalPagesVols() { 
      return Math.max(1, Math.ceil(this.filteredVols.length / this.pageSize)); 
    },
    get filteredVols() {
      let list = this.volunteers;
      if (this.filterCommission) {
        list = list.filter(v => v.commission_id === this.filterCommission);
      }
      if (this.filterSearch.trim()) {
        const q = this.filterSearch.trim().toLowerCase();
        list = list.filter(v => 
          (v.nombres + ' ' + v.apellidos).toLowerCase().includes(q) ||
          (v.email || '').toLowerCase().includes(q) ||
          (v.dni || '').includes(q)
        );
      }
      return list;
    },
    get pagedHours() { const s = (this.pageHours - 1) * this.pageSize; return this.hours.slice(s, s + this.pageSize); },
    get totalPagesHours() { return Math.max(1, Math.ceil(this.hours.length / this.pageSize)); },
    get certPeople() {
      if (!this.certForm.commission_id) return this.volunteers;
      return this.volunteers.filter(v => v.commission_id === this.certForm.commission_id);
    },
    get certHasHours() {
      const f = this.certForm;
      if (!f.person_id || !f.start_date || !f.end_date) return false;
      return this.hours.some(h => h.volunteer_id === f.person_id && h.status === 'activo' && h.entry_date >= f.start_date && h.entry_date <= f.end_date);
    },

    get passwordChecks() {
      const pass = this.newPass;
      return {
        length: pass.length >= 8,
        upper: /[A-Z]/.test(pass),
        lower: /[a-z]/.test(pass),
        number: /[0-9]/.test(pass),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass),
        match: pass === this.newPass2 && pass.length > 0
      };
    },
    get isPasswordValid() {
      const c = this.passwordChecks;
      return c.length && c.upper && c.lower && c.number && c.special && c.match;
    },

    get isCoordView() {
      if (this.myRole === 'coordinador' || this.myRole === 'subcoordinador') return true;
      return this.myCommissions.some(cr => cr.role_type === 'coordinador' || cr.role_type === 'subcoordinador');
    },

    get isCoordinator() {
      if (this.myRole === 'coordinador') return true;
      return this.myCommissions.some(cr => cr.role_type === 'coordinador');
    },

    async init() {
      const bm = document.getElementById('boot-msg');
      if (bm) bm.remove();
      this.ready = true;
      if (!sb) return;
      try {
        if (window.location.hash.includes('type=recovery')) {
          this.showReset = true;
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        const { data } = await sb.auth.getSession();
        if (data.session && !this.showReset) {
          this.session = data.session;
          await this.loadProfile();
          if (this.profile) await this.loadPanel();
        }

        sb.auth.onAuthStateChange(async (event, session) => {
          this.session = session;
          if (event === 'PASSWORD_RECOVERY') { this.showReset = true; return; }
          if (session) { await this.loadProfile(); if (this.profile) await this.loadPanel(); }
          else { this.profile = null; }
        });
      } catch (e) {
        console.error('Error init:', e);
        this.configError = '⚠️ Error de sesión: ' + e.message;
      }
    },

    async login() {
      if (!sb) { this.errorMsg = this.configError || '⚠️ Cliente Supabase no disponible.'; return; }
      this.loading = true; this.errorMsg = '';
      try {
        const { data, error } = await sb.auth.signInWithPassword({
          email: this.email.trim().toLowerCase(),
          password: this.password,
        });
        if (error) throw error;
        this.session = data.session;
        await this.loadProfile();
        if (!this.profile) {
          await sb.auth.signOut(); this.session = null;
          this.errorMsg = 'Tu usuario no está vinculado al sistema. Contacta a RRHH.';
          return;
        }
        if (!this.profile.is_active) {
          await sb.auth.signOut(); this.session = null; this.profile = null;
          this.errorMsg = 'Tu usuario está desactivado. Contacta a RRHH.';
          return;
        }
        this.email = ''; this.password = '';
        await this.loadPanel();
      } catch (err) {
        console.error('Error login:', err);
        this.errorMsg = (err.message || '').includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : (err.message || 'Error al iniciar sesión.');
      } finally { this.loading = false; }
    },

    async loadProfile() {
      if (!sb || !this.session || !this.session.user) return;

      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', this.session.user.id)
        .single();
      if (error || !data) { console.warn('Perfil no encontrado:', error); this.profile = null; return; }

      const { data: crs } = await sb
        .from('commission_roles')
        .select('commission_id, role_type, can_write, commissions(id, name)')
        .eq('person_id', data.person_id);
      data.commission_roles = crs || [];

      this.profile = data;
    },

    async logout() {
      if (sb) await sb.auth.signOut();
      this.session = null; this.profile = null;
      this.volunteers = []; this.hours = []; this.subs = [];
      this.view = 'vol';
    },

        async forgot() {
      if (!sb) { this.errorMsg = this.configError || 'Cliente no disponible.'; return; }
      const correo = this.email.trim().toLowerCase();
      if (!correo) {
        this.errorMsg = 'Escribe tu correo primero.';
        return;
      }
      this.forgotLoading = true;
      this.errorMsg = '';
      const { error } = await sb.auth.resetPasswordForEmail(correo, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      this.forgotLoading = false;
      if (error) {
        this.errorMsg = error.message;
        return;
      }
      // Éxito: regresa al login con el mensaje verde
      this.forgotMode = false;
      this.infoMsg = '📧 Enlace enviado a tu correo (revisa también spam). Al abrirlo podrás crear tu nueva contraseña.';
    },

    cancelForgot() {
      this.forgotMode = false;
      this.errorMsg = '';
    },

    async saveNewPassword() {
      if (!this.isPasswordValid) return;
      
      this.resetMsg = '';
      const { error } = await sb.auth.updateUser({ password: this.newPass });
      
      if (error) { 
        this.resetMsg = error.message; 
        return; 
      }
      
      this.showReset = false;
      this.newPass = ''; 
      this.newPass2 = '';
      this.resetMsg = '';
      
      await sb.auth.signOut();
      this.session = null; 
      this.profile = null;
      this.infoMsg = '✅ Contraseña actualizada correctamente. Ingresa con tu nueva contraseña.';
      
      setTimeout(() => {
        this.session = null;
        this.profile = null;
      }, 100);
    },

    newPerson() {
      this.personForm = { id: null, nombres: '', apellidos: '', dni: '', commission_id: '', internal_role: '', city: '', birth_date: '', phone: '', email: '', career: '', institution: '', education_level: '', works: '', allergies: '', insurance: '', emergency_contact: '', emergency_relationship: '', emergency_phone: '', hobbies: '', pets: '', admission_date: this.today, notes: '' };
      this.fullForm = false;
      this.showPersonForm = true;
    },

    editPerson(v) {
      this.personForm = {
        id: v.id, nombres: v.nombres, apellidos: v.apellidos, dni: v.dni || '',
        commission_id: v.commission_id || '', internal_role: v.internal_role || '',
        city: v.city || '', birth_date: v.birth_date || '', phone: v.phone || '',
        email: v.email || '', career: v.career || '', institution: v.institution || '',
        education_level: v.education_level || '', works: v.works || '',
        allergies: v.allergies || '', insurance: v.insurance || '',
        emergency_contact: v.emergency_contact || '', emergency_relationship: v.emergency_relationship || '',
        emergency_phone: v.emergency_phone || '', hobbies: v.hobbies || '', pets: v.pets || '',
        admission_date: v.admission_date || '', notes: v.notes || ''
      };
      this.fullForm = true;
      this.showPersonForm = true;
    },

    async savePerson() {
      const f = this.personForm;
      if (!f.nombres.trim() || !f.apellidos.trim()) { this.notify('Nombres y apellidos son obligatorios.', 'err'); return; }
      if (!f.commission_id) { this.notify('Selecciona una comisión.', 'err'); return; }
      if (f.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(f.email)) { this.notify('Correo con formato inválido.', 'err'); return; }
      const payload = {
        nombres: f.nombres.trim(), apellidos: f.apellidos.trim(),
        dni: f.dni.trim() || null, commission_id: f.commission_id,
        internal_role: f.internal_role.trim() || null, city: f.city.trim() || null,
        birth_date: f.birth_date || null, phone: f.phone.trim() || null,
        email: f.email.trim().toLowerCase() || null, career: f.career.trim() || null,
        institution: f.institution.trim() || null, education_level: f.education_level.trim() || null,
        works: f.works.trim() || null, allergies: f.allergies.trim() || null,
        insurance: f.insurance.trim() || null, emergency_contact: f.emergency_contact.trim() || null,
        emergency_relationship: f.emergency_relationship.trim() || null,
        emergency_phone: f.emergency_phone.trim() || null, hobbies: f.hobbies.trim() || null,
        pets: f.pets.trim() || null, admission_date: f.admission_date || null,
        notes: f.notes || null, updated_at: new Date().toISOString(),
      };
      let error = null;
      if (f.id) {
        ({ error } = await sb.from('people').update(payload).eq('id', f.id));
      } else {
        payload.status = 'activo';
        ({ error } = await sb.from('people').insert(payload));
      }
      if (error) { this.notify('Error: ' + error.message, 'err'); return; }
      this.showPersonForm = false;
      this.notify(f.id ? '✅ Persona actualizada.' : '✅ Alta registrada.', 'ok');
      await this.refresh();
    },

    async darBaja(v) {
      const fecha = prompt('Fecha de baja (AAAA-MM-DD):', this.today);
      if (!fecha) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { this.notify('Fecha inválida. Usa AAAA-MM-DD.', 'err'); return; }
      const motivo = prompt('Motivo de la baja (obligatorio):');
      if (!motivo) { this.notify('La baja requiere motivo.', 'err'); return; }
      const { error } = await sb.from('people').update({
        status: 'baja', departure_date: fecha, departure_reason: motivo,
        updated_at: new Date().toISOString()
      }).eq('id', v.id);
      if (error) { this.notify('Error: ' + error.message, 'err'); return; }
      this.notify('✅ Baja registrada. El historial se conserva.', 'ok');
      await this.refresh();
    },

    async reactivar(v) {
      const { error } = await sb.from('people').update({
        status: 'activo', departure_date: null, departure_reason: null,
        updated_at: new Date().toISOString()
      }).eq('id', v.id);
      if (error) { this.notify('Error: ' + error.message, 'err'); return; }
      this.notify('✅ Persona reactivada.', 'ok');
      await this.refresh();
    },

    certName(p) { return p ? (p.nombres + ' ' + p.apellidos) : ''; },

    onCertPerson() {
      const p = this.volunteers.find(v => v.id === this.certForm.person_id);
      if (!p) return;
      this.certForm.start_date = p.admission_date || '';
      this.certForm.end_date = p.departure_date || this.today;
    },

    certHtml() {
      const c = this.certPreview;
      if (!c) return '';
      const p = c.person;
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const d = new Date();
      const fmt = (iso) => { if (!iso) return '___'; const q = iso.split('-'); return q[2] + ' de ' + meses[parseInt(q[1], 10) - 1] + ' de ' + q[0]; };
      const dni = p.dni ? ', identificado(a) con DNI ' + p.dni : '';
      const horas = (c.total_hours > 0) ? ' Durante dicho periodo acumuló <strong>' + c.total_hours + ' horas</strong> de voluntariado verificadas en este sistema.' : '';
      return '<div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:24px;">' +
        '<div style="text-align:center;margin-bottom:16px;"><img src="assets/logo.png" style="height:80px;" onerror="this.style.display=\'none\'"/></div>' +
        '<h1 style="text-align:center;letter-spacing:3px;">CONSTANCIA</h1>' +
        '<p style="text-align:right;font-size:12px;">' + c.certificate_code + '</p>' +
        '<p style="text-align:justify;line-height:1.7;">La organización juvenil <strong>EMPODÉRATE VECINO</strong>, acreditada formalmente ante la Secretaría Nacional de la Juventud del Ministerio de Educación mediante la Constancia <strong>No. 00227-2022-MINEDU/DM-SENAJU</strong>, certifica que el(la) señor(a) <strong>' + this.certName(p) + '</strong>' + dni + ', ha desempeñado labores de voluntariado en nuestra organización desde el <strong>' + fmt(c.start_date) + '</strong> hasta el <strong>' + fmt(c.end_date) + '</strong>, ocupando el puesto de <strong>' + (p.internal_role || 'Voluntario(a)') + '</strong>.' + horas + '</p>' +
        '<p style="text-align:justify;line-height:1.7;">Se expide la presente constancia a solicitud del interesado, a los ' + String(d.getDate()).padStart(2, '0') + ' días del mes de ' + meses[d.getMonth()] + ' de ' + d.getFullYear() + '.</p>' +
        '<p style="text-align:justify;line-height:1.7;">Para cualquier confirmación o ampliación de información, por favor comuníquese al correo electrónico empoderatevecino@gmail.com.</p>' +
        '<p>Atentamente,</p>' +
        '<div style="margin-top:56px;border-top:1px solid #334155;width:300px;text-align:center;padding-top:8px;"><strong>Camilo Rizo Leguizamón</strong><br/>Coordinador de Recursos Humanos y Legal<br/>EMPODÉRATE VECINO</div>' +
        '<div style="margin-top:56px;border-top:1px solid #cbd5e1;padding-top:12px;text-align:center;font-size:12px;color:#475569;">@ong.empoderatevecino · 📧 empoderatevecino@gmail.com · 🌐 www.empoderatevecino.com<br/>Potenciando comunidades para una transformación social duradera.</div>' +
        '</div>';
    },

    async generateCert() {
      const f = this.certForm;
      if (!f.person_id || !f.start_date || !f.end_date) { this.notify('Selecciona persona y rango de fechas.', 'err'); return; }
      if (f.end_date < f.start_date) { this.notify('El fin no puede ser anterior al inicio.', 'err'); return; }
      const person = this.volunteers.find(v => v.id === f.person_id);
      const total = this.hours
        .filter(h => h.volunteer_id === f.person_id && h.status === 'activo' && h.entry_date >= f.start_date && h.entry_date <= f.end_date)
        .reduce((s, h) => s + Number(h.hours), 0);
      const year = new Date().getFullYear();
      const { count } = await sb.from('certificates').select('*', { count: 'exact', head: true });
      const code = 'EV-' + year + '-' + String((count || 0) + 1).padStart(4, '0');
      const payload = { person_id: f.person_id, start_date: f.start_date, end_date: f.end_date, total_hours: total, certificate_code: code, issuer_profile: this.profile.id };
      const { error } = await sb.from('certificates').insert(payload);
      if (error) { this.notify('Error: ' + error.message, 'err'); return; }
      this.certPreview = Object.assign({}, payload, { person: person });
      this.notify('✅ Constancia ' + code + ' generada.', 'ok');
    },

    printCert() {
      const html = this.certHtml();
      if (!html) return;
      const w = window.open('', '_blank');
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Constancia</title></head><body>' + html + '</body></html>');
      w.document.close();
      w.focus();
      w.print();
    },

    async loadPanel() {
      if (!this.profile) return;
      const [{ data: c }, { data: a }] = await Promise.all([
        sb.from('commissions').select('*').order('name'),
        sb.from('activities').select('*').eq('active', true).order('name')
      ]);
      this.commissions = c || [];
      this.activities = a || [];
      await this.refresh();
    },

    async refresh() {
      const [{ data: v }, { data: h }] = await Promise.all([
        sb.from('people').select('*').order('apellidos'),
        sb.from('hour_entries')
          .select('*, people(nombres, apellidos), activities(name)')
          .order('created_at', { ascending: false })
      ]);
      this.volunteers = v || [];
      this.hours = h || [];
      if (this.myCommission) {
        const { data: s } = await sb
          .from('commission_roles')
          .select('*, people(nombres, apellidos)')
          .eq('commission_id', this.myCommission.commission_id)
          .eq('role_type', 'subcoordinador');
        this.subs = s || [];
      }
      if (this.view === 'rep') this.$nextTick(() => this.renderChart());
    },

    async submitHour() {
      this.notice = '';
      const f = this.form;
      if (!f.volunteer_id || !f.activity_id || !f.entry_date || !f.hours) {
        this.notify('Completa voluntario, actividad, fecha y horas.', 'err'); return;
      }
      const { error } = await sb.rpc('register_hour', {
        p_volunteer_id: f.volunteer_id,
        p_activity_id: f.activity_id,
        p_entry_date: f.entry_date,
        p_hours: parseFloat(f.hours),
        p_description: f.description || null
      });
      if (error) { this.notify('Error: ' + error.message, 'err'); return; }
      this.notify('✅ Hora registrada correctamente.', 'ok');
      this.form = { volunteer_id: '', activity_id: '', entry_date: '', hours: '', description: '' };
      await this.refresh();
    },

    async toggleSub(cr) {
      const { error } = await sb.rpc('set_subcoordinator_write', {
        p_person_id: cr.person_id,
        p_commission_id: cr.commission_id,
        p_can_write: !cr.can_write
      });
      if (error) { this.notify('Error: ' + error.message, 'err'); }
      else { this.notify('✅ Permiso de escritura actualizado.', 'ok'); await this.refresh(); }
    },

    async annul(h) {
      const reason = prompt('Motivo de anulación (obligatorio):');
      if (!reason) return;
      const { error } = await sb.rpc('annul_hour', { p_hour_entry_id: h.id, p_reason: reason });
      if (error) { this.notify('Error: ' + error.message, 'err'); }
      else { this.notify('✅ Hora anulada.', 'ok'); await this.refresh(); }
    },

    notify(msg, type) {
      this.notice = msg; this.noticeType = type;
      setTimeout(() => { this.notice = ''; }, 5000);
    },

    commissionName(id) {
      const c = this.commissions.find(x => x.id === id);
      return c ? c.name : '';
    },

    fullName(p) { return p ? (p.apellidos + ', ' + p.nombres) : ''; },

    totalHours(list) {
      return list.filter(h => h.status === 'activo').reduce((s, h) => s + Number(h.hours), 0);
    },

    exportXLS() {
      if (!window.XLSX) { this.notify('Librería XLS no disponible.', 'err'); return; }
      const rows = this.hours.map(h => ({
        Fecha: h.entry_date,
        Voluntario: this.fullName(h.people),
        Comision: this.commissionName(h.commission_id),
        Actividad: h.activities ? h.activities.name : '',
        Horas: Number(h.hours),
        Estado: h.status
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Horas');
      window.XLSX.writeFile(wb, 'horas_voluntariado.xlsx');
    },

    renderChart() {
      const canvas = document.getElementById('chartHours');
      if (!canvas || !window.Chart) return;
      const act = {};
      const monthsSet = new Set();
      this.hours.filter(h => h.status === 'activo').forEach(h => {
        const m = h.entry_date.slice(0, 7);
        monthsSet.add(m);
        const a = h.activities ? h.activities.name : 'Otro';
        if (!act[a]) act[a] = {};
        act[a][m] = (act[a][m] || 0) + Number(h.hours);
      });
      const months = Array.from(monthsSet).sort();
      const labels = months.map(m => { const p = m.split('-'); return p[1] + '/' + p[0]; });
      const colors = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
      const datasets = Object.keys(act).map((a, i) => ({
        label: a,
        data: months.map(m => act[a][m] || 0),
        backgroundColor: colors[i % colors.length],
      }));
      if (this.chart) { this.chart.destroy(); }
      this.chart = new window.Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
          plugins: { legend: { position: 'bottom' } },
        },
      });
    },

    onCertCommission() {
      this.certForm.person_id = '';
      this.certForm.start_date = '';
      this.certForm.end_date = '';
      this.certPreview = null;
    },
  };
}