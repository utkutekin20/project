import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ThemeToggleButton from "../helper/ThemeToggleButton";

const MasterLayout = ({ children }) => {
  let [sidebarActive, seSidebarActive] = useState(false);
  let [mobileMenu, setMobileMenu] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  // Firma adını ve bildirimleri çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (window.api) {
          // Firma adını çek
          if (window.api.settings) {
            const result = await window.api.settings.get();
            if (result.success && result.data && result.data.company_name) {
              setCompanyName(result.data.company_name);
            }
          }
          
          // Süresi yaklaşan/geçen tüpleri çek (30 gün içinde)
          if (window.api.tube && window.api.tube.getExpiring) {
            const expiringResult = await window.api.tube.getExpiring(30);
            if (expiringResult.success && expiringResult.data) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              const alerts = expiringResult.data.map(tube => {
                const expiryDate = new Date(tube.son_kullanim_tarihi);
                expiryDate.setHours(0, 0, 0, 0);
                const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                
                let type = 'warning';
                let message = '';
                
                if (daysLeft < 0) {
                  type = 'danger';
                  message = `Süresi ${Math.abs(daysLeft)} gün önce doldu`;
                } else if (daysLeft === 0) {
                  type = 'danger';
                  message = 'Bugün süresi doluyor!';
                } else if (daysLeft <= 7) {
                  type = 'danger';
                  message = `${daysLeft} gün kaldı`;
                } else {
                  message = `${daysLeft} gün kaldı`;
                }
                
                return {
                  id: tube.id,
                  tube_seri: tube.seri_no,
                  customer_name: tube.customer_name,
                  type,
                  message,
                  daysLeft,
                  son_kullanim: tube.son_kullanim_tarihi
                };
              });
              
              // En acil olanları öne al
              alerts.sort((a, b) => a.daysLeft - b.daysLeft);
              setNotifications(alerts);
            }
          }
        }
      } catch (error) {
        console.error('Veri çekme hatası:', error);
      }
    };
    fetchData();
    
    // Her 5 dakikada bir güncelle
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  let sidebarControl = () => {
    seSidebarActive(!sidebarActive);
  };

  let mobileMenuControl = () => {
    setMobileMenu(!mobileMenu);
  };

  return (
    <section className={mobileMenu ? "overlay active" : "overlay "}>
      {/* sidebar */}
      <aside
        className={
          sidebarActive
            ? "sidebar active "
            : mobileMenu
            ? "sidebar sidebar-open"
            : "sidebar"
        }
      >
        <button
          onClick={mobileMenuControl}
          type='button'
          className='sidebar-close-btn'
        >
          <Icon icon='radix-icons:cross-2' />
        </button>
        <div>
          <Link to='/' className='sidebar-logo'>
            <div className='d-flex align-items-center gap-2'>
              <Icon icon='mdi:fire-extinguisher' className='text-danger-600 flex-shrink-0' style={{ fontSize: '32px' }} />
              <div className='d-flex flex-column sidebar-logo-text' style={{ overflow: 'hidden', maxWidth: '180px' }}>
                <span 
                  className='fw-bold text-primary-600' 
                  style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.2', 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}
                  title={companyName || 'Yangın Söndürme'}
                >
                  {companyName || 'Yangın Söndürme'}
                </span>
                <span className='text-secondary-light' style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>Tüp Takip Sistemi</span>
              </div>
            </div>
          </Link>
        </div>
        <div className='sidebar-menu-area'>
          <ul className='sidebar-menu' id='sidebar-menu'>
            {/* Ana Sayfa */}
            <li>
              <NavLink
                to='/'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='solar:home-smile-angle-outline' className='menu-icon' />
                <span>Ana Sayfa</span>
              </NavLink>
            </li>

            <li className='sidebar-menu-group-title'>Yönetim</li>
            
            {/* Müşteriler */}
            <li>
              <NavLink
                to='/customers'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:user-group' className='menu-icon' />
                <span>Müşteriler</span>
              </NavLink>
            </li>

            {/* Tüp Kayıt */}
            <li>
              <NavLink
                to='/tubes'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='mdi:fire-extinguisher' className='menu-icon' />
                <span>Tüp Kayıt</span>
              </NavLink>
            </li>

            {/* Tüp Listesi */}
            <li>
              <NavLink
                to='/tube-list'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:clipboard-document-list' className='menu-icon' />
                <span>Tüp Listesi</span>
              </NavLink>
            </li>

            {/* Sertifikalar */}
            <li>
              <NavLink
                to='/certificates'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:document-check' className='menu-icon' />
                <span>Sertifikalar</span>
              </NavLink>
            </li>

            {/* Raporlar */}
            <li>
              <NavLink
                to='/reports'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:clipboard-document' className='menu-icon' />
                <span>Raporlar</span>
              </NavLink>
            </li>

            <li className='sidebar-menu-group-title'>Finans</li>

            {/* Fiyatlar */}
            <li>
              <NavLink
                to='/prices'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:currency-dollar' className='menu-icon' />
                <span>Fiyatlar</span>
              </NavLink>
            </li>

            {/* Teklifler */}
            <li>
              <NavLink
                to='/quotes'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:document-text' className='menu-icon' />
                <span>Teklifler</span>
              </NavLink>
            </li>

            {/* Sözleşmeler */}
            <li>
              <NavLink
                to='/contracts'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:clipboard-document-check' className='menu-icon' />
                <span>Sözleşmeler</span>
              </NavLink>
            </li>

            {/* Faturalar */}
            <li>
              <NavLink
                to='/invoices'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:document-currency-dollar' className='menu-icon' />
                <span>Faturalar</span>
              </NavLink>
            </li>

            <li className='sidebar-menu-group-title'>Sistem</li>

            {/* Uyarılar */}
            <li>
              <NavLink
                to='/warnings'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:exclamation-triangle' className='menu-icon' />
                <span>Uyarılar</span>
              </NavLink>
            </li>

            {/* Veri Aktarımı */}
            <li>
              <NavLink
                to='/data-import'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:arrow-down-tray' className='menu-icon' />
                <span>Veri Aktarımı</span>
              </NavLink>
            </li>

            {/* Yedekleme */}
            <li>
              <NavLink
                to='/backup'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:cloud-arrow-up' className='menu-icon' />
                <span>Yedekleme</span>
              </NavLink>
            </li>

            {/* İşlem Geçmişi */}
            <li>
              <NavLink
                to='/logs'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:clock' className='menu-icon' />
                <span>İşlem Geçmişi</span>
              </NavLink>
            </li>

            {/* Ayarlar */}
            <li>
              <NavLink
                to='/settings'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='heroicons:cog-6-tooth' className='menu-icon' />
                <span>Ayarlar</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>

      <main
        className={sidebarActive ? "dashboard-main active" : "dashboard-main"}
      >
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-4'>
                <button
                  type='button'
                  className='sidebar-toggle'
                  onClick={sidebarControl}
                >
                  {sidebarActive ? (
                    <Icon
                      icon='iconoir:arrow-right'
                      className='icon text-2xl non-active'
                    />
                  ) : (
                    <Icon
                      icon='heroicons:bars-3-solid'
                      className='icon text-2xl non-active '
                    />
                  )}
                </button>
                <button
                  onClick={mobileMenuControl}
                  type='button'
                  className='sidebar-mobile-toggle'
                >
                  <Icon icon='heroicons:bars-3-solid' className='icon' />
                </button>
                <form className='navbar-search'>
                  <input type='text' name='search' placeholder='Ara...' />
                  <Icon icon='ion:search-outline' className='icon' />
                </form>
              </div>
            </div>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-3'>
                {/* ThemeToggleButton */}
                <ThemeToggleButton />

                {/* Bildirimler */}
                <div className='dropdown'>
                  <button
                    className={`${notifications.length > 0 ? 'has-indicator' : ''} w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center position-relative`}
                    type='button'
                    data-bs-toggle='dropdown'
                  >
                    <Icon
                      icon='iconoir:bell'
                      className={`text-xl ${notifications.some(n => n.type === 'danger') ? 'text-danger-main' : notifications.length > 0 ? 'text-warning-main' : 'text-primary-light'}`}
                    />
                    {notifications.length > 0 && (
                      <span className="position-absolute top-0 end-0 w-8-px h-8-px bg-danger-main rounded-circle"></span>
                    )}
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-lg p-0'>
                    <div className='m-16 py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-0'>
                          Bildirimler
                        </h6>
                      </div>
                      <span className={`fw-semibold text-lg w-40-px h-40-px rounded-circle bg-base d-flex justify-content-center align-items-center ${notifications.length > 0 ? 'text-danger-600' : 'text-primary-600'}`}>
                        {notifications.length}
                      </span>
                    </div>
                    <div className='max-h-400-px overflow-y-auto scroll-sm pe-4'>
                      {notifications.length === 0 ? (
                        <div className='px-24 py-12 text-center text-secondary-light'>
                          Yeni bildirim yok
                        </div>
                      ) : (
                        notifications.slice(0, 10).map(notification => (
                          <Link
                            key={notification.id}
                            to={`/tube-list`}
                            className='px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between border-bottom hover-bg-neutral-100'
                          >
                            <div className={`w-44-px h-44-px ${notification.type === 'danger' ? 'bg-danger-100' : 'bg-warning-100'} rounded-circle d-flex justify-content-center align-items-center flex-shrink-0`}>
                              <Icon
                                icon={notification.type === 'danger' ? 'mingcute:alert-fill' : 'solar:danger-triangle-bold'}
                                className={`text-xl ${notification.type === 'danger' ? 'text-danger-600' : 'text-warning-600'}`}
                              />
                            </div>
                            <div className='flex-grow-1'>
                              <h6 className='text-md fw-semibold mb-4'>
                                {notification.tube_seri}
                              </h6>
                              <p className='mb-0 text-sm text-secondary-light fw-normal'>
                                {notification.customer_name} - <span className={notification.type === 'danger' ? 'text-danger-600 fw-medium' : 'text-warning-600 fw-medium'}>{notification.message}</span>
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className='text-center py-12 border-top'>
                        <Link to='/tube-list' className='text-primary-600 fw-medium text-sm hover-text-primary'>
                          Tümünü Gör ({notifications.length})
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                {/* Notification dropdown end */}
                
                {/* Kullanıcı Profili */}
                <div className='dropdown'>
                  <button
                    className='d-flex justify-content-center align-items-center rounded-circle'
                    type='button'
                    data-bs-toggle='dropdown'
                  >
                    <div className='w-40-px h-40-px bg-primary-600 rounded-circle d-flex justify-content-center align-items-center'>
                      <Icon icon='heroicons:user' className='text-white text-xl' />
                    </div>
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-sm'>
                    <div className='py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-2'>
                          Yönetici
                        </h6>
                        <span className='text-secondary-light fw-medium text-sm'>
                          Admin
                        </span>
                      </div>
                      <button type='button' className='hover-text-danger'>
                        <Icon
                          icon='radix-icons:cross-1'
                          className='icon text-xl'
                        />
                      </button>
                    </div>
                    <ul className='to-top-list'>
                      <li>
                        <Link
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'
                          to='/settings'
                        >
                          <Icon
                            icon='heroicons:cog-6-tooth'
                            className='icon text-xl'
                          />
                          Ayarlar
                        </Link>
                      </li>
                      <li>
                        <Link
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3'
                          to='#'
                        >
                          <Icon icon='lucide:power' className='icon text-xl' />{" "}
                          Çıkış Yap
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                {/* Profile dropdown end */}
              </div>
            </div>
          </div>
        </div>

        {/* dashboard-main-body */}
        <div className='dashboard-main-body'>{children}</div>

        {/* Footer section */}
        <footer className='d-footer'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <p className='mb-0'>© {new Date().getFullYear()} {companyName || 'Yangın Söndürme'}. Tüm Hakları Saklıdır.</p>
            </div>
            <div className='col-auto'>
              <p className='mb-0'>
                <span className='text-primary-600'>Tüp Takip Sistemi v1.0.0</span>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </section>
  );
};

export default MasterLayout;
