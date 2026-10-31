/* ==========================================
   0. SUPABASE CONFIGURATION
   ========================================== */
// Yahan apna Supabase URL aur Anon Key paste karein:
const SUPABASE_URL = 'https://nunelbjxhnrenhsyiqpm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ULneCUgMjojvZOt-wuQxhw_xyiihVBP';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   1. APPLICATION STATE (DATA STORAGE)
   ========================================== */
let productsList = [];
let groupsList = [];
let categoriesList = [];
let uploadedImagesList = [];
let calcExpression = "";

let storeLogoData = null;
let ownerPhotoData = null;
let storeBannerData = null;

/* ==========================================
   2. INITIALIZATION ON PAGE LOAD (FETCH FROM SUPABASE)
   ========================================== */
window.addEventListener('DOMContentLoaded', async () => {
    await loadAllDataFromSupabase();
});

async function loadAllDataFromSupabase() {
    try {
        // 1. Store Settings & Metal Rates Load Karein
        const { data: settings } = await supabaseClient
            .from('store_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settings) {
            // Inputs aur UI update karein
            document.getElementById('inputStoreName').value = settings.store_name !== 'Your Store Name' ? settings.store_name : '';
            document.getElementById('inputOwnerName').value = settings.owner_name !== 'Not Provided' ? settings.owner_name : '';
            document.getElementById('inputMobile').value = settings.mobile !== 'Not Provided' ? settings.mobile : '';
            document.getElementById('inputEmail').value = settings.email !== 'Not Provided' ? settings.email : '';
            document.getElementById('inputAddress').value = settings.address !== 'Not Provided' ? settings.address : '';

            document.getElementById('headerStoreName').innerText = settings.store_name;
            document.getElementById('profileStoreName').innerText = settings.store_name;
            document.getElementById('catStoreName').innerText = settings.store_name;
            document.title = settings.store_name;

            document.getElementById('profileOwnerName').innerText = settings.owner_name;
            document.getElementById('profileMobile').innerText = settings.mobile;
            document.getElementById('profileWhatsapp').innerText = settings.whatsapp;
            document.getElementById('profileEmail').innerText = settings.email;
            document.getElementById('profileStoreAddress').innerText = settings.address;

            document.getElementById('sidebarMobileDisplay').innerText = settings.mobile !== "Not Provided" ? settings.mobile : "Add Mobile No.";
            document.getElementById('sidebarEmailDisplay').innerText = settings.email !== "Not Provided" ? settings.email : "Add Email in Profile";

            if (settings.logo_url) {
                document.getElementById('storeLogoPreview').src = settings.logo_url;
                document.getElementById('storeProfileAvatar').src = settings.logo_url;
                document.getElementById('catStoreLogo').src = settings.logo_url;
            }
            if (settings.owner_photo_url) {
                document.getElementById('ownerPhotoPreview').src = settings.owner_photo_url;
            }
            if (settings.banner_url) {
                document.getElementById('storePhotoPreview').src = settings.banner_url;
                document.getElementById('profileBannerImg').src = settings.banner_url;
            }

            // Metal Rates Set Karein
            document.getElementById('baseGoldRateInput').value = settings.gold_rate_24k || '';
            document.getElementById('baseSilverRateInput').value = settings.silver_rate_kg || '';
            recalculateMetalRates();
        }

        // 2. Groups Load Karein
        const { data: groups } = await supabaseClient.from('groups').select('*').order('id');
        if (groups) groupsList = groups;

        // 3. Categories Load Karein
        const { data: categories } = await supabaseClient.from('categories').select('*').order('id');
        if (categories) categoriesList = categories;

        // 4. Products Load Karein
        const { data: products } = await supabaseClient.from('products').select('*').order('id', { ascending: false });
        if (products) {
            productsList = products;
            document.getElementById('dashProdCountBadge').innerText = productsList.length;
            document.getElementById('profileTotalProdCount').innerText = productsList.length;
        }

        // 5. Finance Ledger Load Karein
        const { data: ledger } = await supabaseClient.from('ledger_entries').select('*').order('id');
        if (ledger) {
            const tbody = document.getElementById('ledgerTableBody');
            tbody.innerHTML = '';
            ledger.forEach((entry, idx) => renderLedgerRowUI(entry, idx + 1));
            calculateLedgerTotals();
        }

        renderGroupsAndCategories();
        renderCatalogueCategories();
        renderCatalogueProducts();

    } catch (err) {
        console.error("Supabase data load error:", err);
    }
}

/* ==========================================
   3. NAVIGATION & TAB SWITCHING
   ========================================== */
function switchTab(tabName) {
    const catTab = document.getElementById('tabCatalogue');
    const custTab = document.getElementById('tabCustomers');
    const finTab = document.getElementById('tabFinance');

    const catContent = document.getElementById('contentCatalogue');
    const custContent = document.getElementById('contentCustomers');
    const finContent = document.getElementById('contentFinance');

    const inactiveClass = "inline-flex items-center space-x-1 py-3 text-slate-500 font-medium text-sm px-4 hover:text-slate-700 transition flex-shrink-0";
    const activeClass = "inline-flex items-center space-x-1 py-3 border-b-2 border-amber-600 text-amber-700 font-bold text-sm px-4 transition flex-shrink-0";

    catTab.className = inactiveClass;
    custTab.className = inactiveClass;
    finTab.className = inactiveClass;

    catContent.classList.add('hidden');
    custContent.classList.add('hidden');
    finContent.classList.add('hidden');

    if (tabName === 'catalogue') {
        catTab.className = activeClass;
        catContent.classList.remove('hidden');
    } else if (tabName === 'customers') {
        custTab.className = activeClass;
        custContent.classList.remove('hidden');
    } else if (tabName === 'finance') {
        finTab.className = activeClass;
        finContent.classList.remove('hidden');
    }
}

function switchScreen(screenId) {
    const allScreens = [
        'addProductScreen',
        'editProfileScreen',
        'categoriesScreen',
        'metalRatesScreen',
        'viewCatalogueScreen',
        'storeProfileScreen'
    ];

    allScreens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        target.scrollTop = 0;
    }

    if (screenId === 'viewCatalogueScreen') {
        renderCatalogueProducts();
        renderCatalogueCategories();
    }
}

function toggleHamburgerMenu() {
    const sidebar = document.getElementById('hamburgerSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function menuAction(featureName) {
    toggleHamburgerMenu();
    if (featureName === 'My Profile') {
        switchScreen('editProfileScreen');
    } else if (featureName === 'View Catalogue') {
        switchScreen('viewCatalogueScreen');
    } else {
        alertBox(`Opening ${featureName}...`);
    }
}

function alertBox(message) {
    const banner = document.createElement('div');
    banner.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl z-50 transition-all';
    banner.innerText = message;
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 2500);
}

/* ==========================================
   4. PROFILE MANAGEMENT (SUPABASE UPDATE)
   ========================================== */
async function saveProfileChanges() {
    const storeName = document.getElementById('inputStoreName').value.trim() || "Your Store Name";
    const ownerName = document.getElementById('inputOwnerName').value.trim() || "Not Provided";
    const mobile = document.getElementById('inputMobile').value.trim() || "Not Provided";
    const email = document.getElementById('inputEmail').value.trim() || "Not Provided";
    const address = document.getElementById('inputAddress').value.trim() || "Not Provided";

    const updatePayload = {
        store_name: storeName,
        owner_name: ownerName,
        mobile: mobile,
        whatsapp: mobile,
        email: email,
        address: address,
        updated_at: new Date().toISOString()
    };

    if (storeLogoData) updatePayload.logo_url = storeLogoData;
    if (ownerPhotoData) updatePayload.owner_photo_url = ownerPhotoData;
    if (storeBannerData) updatePayload.banner_url = storeBannerData;

    const { error } = await supabaseClient
        .from('store_settings')
        .update(updatePayload)
        .eq('id', 1);

    if (error) {
        console.error(error);
        alertBox('Error saving profile!');
        return;
    }

    document.getElementById('headerStoreName').innerText = storeName;
    document.getElementById('profileStoreName').innerText = storeName;
    document.getElementById('catStoreName').innerText = storeName;
    document.title = storeName;

    document.getElementById('profileOwnerName').innerText = ownerName;
    document.getElementById('profileMobile').innerText = mobile;
    document.getElementById('profileWhatsapp').innerText = mobile;
    document.getElementById('profileEmail').innerText = email;
    document.getElementById('profileStoreAddress').innerText = address;

    document.getElementById('sidebarMobileDisplay').innerText = mobile !== "Not Provided" ? mobile : "Add Mobile No.";
    document.getElementById('sidebarEmailDisplay').innerText = email !== "Not Provided" ? email : "Add Email in Profile";

    switchScreen('dashboardScreen');
    alertBox('Profile Saved to Supabase!');
}

function previewProfileImage(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imgUrl = e.target.result;
            document.getElementById(previewId).src = imgUrl;

            if (previewId === 'storeLogoPreview') {
                storeLogoData = imgUrl;
                document.getElementById('storeProfileAvatar').src = imgUrl;
                document.getElementById('catStoreLogo').src = imgUrl;
            }
            if (previewId === 'ownerPhotoPreview') {
                ownerPhotoData = imgUrl;
            }
            if (previewId === 'storePhotoPreview') {
                storeBannerData = imgUrl;
                document.getElementById('profileBannerImg').src = imgUrl;
            }
        };
        reader.readAsDataURL(file);
    }
}

/* ==========================================
   5. PRODUCT UPLOAD & CATALOGUE CRUD
   ========================================== */
function toggleCatalogueOptionsMenu() {
    const menu = document.getElementById('catalogueOptionsMenu');
    menu.classList.toggle('hidden');
}

window.addEventListener('click', function (e) {
    const menu = document.getElementById('catalogueOptionsMenu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.fa-ellipsis-vertical')) {
        menu.classList.add('hidden');
    }
});

function handleImageUpload(event) {
    const files = event.target.files;
    const container = document.getElementById('imagePreviewContainer');
    const countText = document.getElementById('imgCountText');

    if (files.length > 0) {
        container.classList.remove('hidden');
        for (let i = 0; i < files.length; i++) {
            if (uploadedImagesList.length >= 7) break;
            const reader = new FileReader();
            reader.onload = function (e) {
                uploadedImagesList.push(e.target.result);
                const div = document.createElement('div');
                div.className = 'relative w-full h-16 bg-slate-200 rounded-xl overflow-hidden border border-amber-300 shadow-sm';
                div.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
                container.appendChild(div);
                countText.innerText = `${uploadedImagesList.length}/15`;
            };
            reader.readAsDataURL(files[i]);
        }
    }
}

// async function saveAndUploadProduct() {
//     const name = document.getElementById('prodNameInput').value.trim() || "Unnamed Product";
//     const category = document.getElementById('productCategorySelect').value || "Uncategorized";
//     const metal_type = document.getElementById('prodMetalType').value || "gold";
//     const purity = document.getElementById('prodPurity').value || "22K";
//     const size = document.getElementById('prodSize').value.trim() || "";
//     const weight = parseFloat(document.getElementById('prodWeight').value) || 0;
//     const price = document.getElementById('prodAutoPrice').value || "₹0";
//     const images = uploadedImagesList.length > 0 ? uploadedImagesList : ["https://placehold.co/300x300/d4af37/ffffff?text=Product"];

//     const { data, error } = await supabaseClient
//         .from('products')
//         .insert([{ name, category, metal_type, purity, size, weight, price, images }])
//         .select()
//         .single();

//     if (error) {
//         console.error(error);
//         alertBox('Error uploading product!');
//         return;
//     }

//     productsList.unshift(data);

//     document.getElementById('dashProdCountBadge').innerText = productsList.length;
//     document.getElementById('profileTotalProdCount').innerText = productsList.length;

//     uploadedImagesList = [];
//     document.getElementById('imagePreviewContainer').innerHTML = '';
//     document.getElementById('imagePreviewContainer').classList.add('hidden');
//     document.getElementById('prodNameInput').value = '';
//     document.getElementById('prodWeight').value = '';
//     document.getElementById('prodSize').value = '';
//     document.getElementById('prodAutoPrice').value = '₹0';
//     document.getElementById('imgCountText').innerText = '0/15';

//     renderGroupsAndCategories();
//     switchScreen('dashboardScreen');
//     alertBox('Product Uploaded to Supabase!');
// }

async function saveAndUploadProduct() {
    const name = document.getElementById('prodNameInput').value.trim() || "Unnamed Product";
    const category = document.getElementById('productCategorySelect').value || "Uncategorized";
    const metal_type = document.getElementById('prodMetalType').value || "gold";
    const purity = document.getElementById('prodPurity').value || "22K";
    const size = document.getElementById('prodSize').value.trim() || "";
    const weight = parseFloat(document.getElementById('prodWeight').value) || 0;
    const price = document.getElementById('prodAutoPrice').value || "₹0";

    let imageUrls = [];

    // 1. Agar user ne images select ki hain, toh unhe Supabase Bucket mein upload karein
    const fileInput = document.getElementById('productImageInput');
    if (fileInput.files && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            if (i >= 7) break; // Max 7 images
            const file = fileInput.files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${i}.${fileExt}`;
            const filePath = `${fileName}`;

            // Supabase Storage mein upload karna
            // Is tarah badlein:
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('IMAGE') // Yahan pehle product-images tha, ab IMAGE karein
                .upload(filePath, file);

            if (uploadError) {
                console.error("Image upload error:", uploadError);
                continue;
            }

            // Public URL nikalna
            const { data: publicURLData } = supabaseClient.storage
                .from('IMAGE') // Yahan pehle product-images tha, ab IMAGE karein
                .getPublicUrl(filePath);

            if (publicURLData) {
                imageUrls.push(publicURLData.publicUrl);
            }
        }
    }

    // Agar koi image select nahi ki toh default placeholder
    if (imageUrls.length === 0) {
        imageUrls.push("https://placehold.co/300x300/d4af37/ffffff?text=Product");
    }

    // 2. Database mein Product ka data save karna (Images ke public URL ke sath)
    const { data, error } = await supabaseClient
        .from('products')
        .insert([{
            name,
            category,
            metal_type,
            purity,
            size,
            weight,
            price,
            images: imageUrls
        }])
        .select()
        .single();

    if (error) {
        console.error(error);
        alertBox('Error uploading product!');
        return;
    }

    productsList.unshift(data);

    document.getElementById('dashProdCountBadge').innerText = productsList.length;
    document.getElementById('profileTotalProdCount').innerText = productsList.length;

    // Form reset karna
    uploadedImagesList = [];
    fileInput.value = '';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('prodNameInput').value = '';
    document.getElementById('prodWeight').value = '';
    document.getElementById('prodSize').value = '';
    document.getElementById('prodAutoPrice').value = '₹0';
    document.getElementById('imgCountText').innerText = '0/15';

    renderGroupsAndCategories();
    switchScreen('dashboardScreen');
    alertBox('Product & Images Uploaded to Bucket!');
}


async function deleteProductFromSupabase(id) {
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        alertBox('Error deleting product!');
        return;
    }
    productsList = productsList.filter(p => p.id !== id);
    document.getElementById('dashProdCountBadge').innerText = productsList.length;
    document.getElementById('profileTotalProdCount').innerText = productsList.length;
    renderCatalogueProducts();
    renderGroupsAndCategories();
    alertBox('Product Deleted!');
}

function renderCatalogueProducts(filterCategory = null) {
    const area = document.getElementById('catalogueProductsArea');
    const filtered = filterCategory ? productsList.filter(p => p.category === filterCategory) : productsList;

    if (filtered.length === 0) {
        area.innerHTML = `
            <div id="noProductsPlaceholder" class="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div class="w-16 h-16 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-box-open"></i></div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">No products found.</p>
                <p class="text-[11px] text-slate-400">Add products from dashboard to display here.</p>
            </div>
        `;
    } else {
        area.innerHTML = filtered.map(p => {
            const img = (p.images && p.images.length > 0) ? p.images[0] : "https://placehold.co/300x300/d4af37/ffffff?text=Product";
            return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex space-x-3 p-3 items-center">
                <img src="${img}" class="w-20 h-20 rounded-xl object-cover border border-slate-100 flex-shrink-0">
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">${p.category}</span>
                        <h4 class="text-xs font-bold text-slate-800 mt-1">${p.name}</h4>
                        <p class="text-[10px] text-slate-400">${p.metal_type ? p.metal_type.toUpperCase() : ''} ${p.purity || ''}</p>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-xs font-bold text-amber-700">${p.price}</span>
                        <span class="text-[10px] text-slate-500 font-medium">${p.weight}g</span>
                    </div>
                </div>
                <button onclick="deleteProductFromSupabase(${p.id})" class="text-rose-400 hover:text-rose-600 p-2 text-sm"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `}).join('');
    }
}

/* ==========================================
   6. GROUPS & CATEGORIES MANAGEMENT (SUPABASE)
   ========================================== */
function openNewGroupModal() {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('groupModal').classList.remove('hidden');
}

function openNewCategoryModal() {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('categoryModal').classList.remove('hidden');
}

function closeModals() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('groupModal').classList.add('hidden');
    document.getElementById('categoryModal').classList.add('hidden');
}

async function saveNewGroup() {
    const input = document.getElementById('newGroupNameInput');
    const name = input.value.trim();
    if (!name) return alertBox('Please enter a group name');

    const { data, error } = await supabaseClient.from('groups').insert([{ name }]).select().single();
    if (error) return alertBox('Group already exists or error!');

    groupsList.push(data);
    input.value = '';
    renderGroupsAndCategories();
    closeModals();
    alertBox('Group Added!');
}

async function saveNewCategory() {
    const input = document.getElementById('newCategoryNameInput');
    const name = input.value.trim();
    if (!name) return alertBox('Please enter a category name');

    const { data, error } = await supabaseClient.from('categories').insert([{ name }]).select().single();
    if (error) return alertBox('Category already exists or error!');

    categoriesList.push(data);
    input.value = '';
    renderGroupsAndCategories();
    renderCatalogueCategories();
    closeModals();
    alertBox('Category Added!');
}

function renderGroupsAndCategories() {
    const groupContainer = document.getElementById('groupsListContainer');
    document.getElementById('groupCountBadge').innerText = `${groupsList.length} groups`;

    if (groupsList.length === 0) {
        groupContainer.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm"><p class="text-xs text-slate-400">No groups created yet. Click <b>+ Group</b> to add your first group.</p></div>`;
    } else {
        groupContainer.innerHTML = groupsList.map(g => `
            <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs"><i class="fa-solid fa-folder"></i></div>
                    <h4 class="text-xs font-bold text-slate-800">${g.name}</h4>
                </div>
                <button onclick="deleteGroup(${g.id})" class="text-rose-400 hover:text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join('');
    }

    const catContainer = document.getElementById('categoriesListContainer');
    document.getElementById('categoryCountBadge').innerText = `${categoriesList.length} categories`;

    if (categoriesList.length === 0) {
        catContainer.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm"><p class="text-xs text-slate-400">No categories created yet. Click <b>+ Category</b> to add your first category.</p></div>`;
    } else {
        catContainer.innerHTML = categoriesList.map(c => {
            const count = productsList.filter(p => p.category === c.name).length;
            return `
                <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center text-sky-500 font-bold text-xs"><i class="fa-solid fa-tags"></i></div>
                        <div>
                            <h4 class="text-xs font-bold text-slate-800">${c.name}</h4>
                            <span class="text-[10px] text-slate-400">${count} products</span>
                        </div>
                    </div>
                    <button onclick="deleteCategory(${c.id})" class="text-rose-400 hover:text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }).join('');
    }

    const select = document.getElementById('productCategorySelect');
    if (select) {
        select.innerHTML = `<option value="" disabled selected>Select category</option>` +
            categoriesList.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

async function deleteGroup(id) {
    await supabaseClient.from('groups').delete().eq('id', id);
    groupsList = groupsList.filter(g => g.id !== id);
    renderGroupsAndCategories();
}

async function deleteCategory(id) {
    await supabaseClient.from('categories').delete().eq('id', id);
    categoriesList = categoriesList.filter(c => c.id !== id);
    renderGroupsAndCategories();
    renderCatalogueCategories();
}

function renderCatalogueCategories() {
    const bar = document.getElementById('catalogueCategoriesBar');
    if (!bar) return;

    if (categoriesList.length === 0) {
        bar.innerHTML = `<p class="text-[11px] text-slate-400 py-1">No categories added yet.</p>`;
        return;
    }

    const allBtn = `
        <div onclick="renderCatalogueProducts(null)" class="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer">
            <div class="w-14 h-14 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-xs shadow-sm">ALL</div>
            <span class="text-[11px] font-semibold text-slate-700">All</span>
        </div>
    `;

    const catBtns = categoriesList.map(c => `
        <div onclick="renderCatalogueProducts('${c.name}')" class="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer">
            <div class="w-14 h-14 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs overflow-hidden shadow-sm">
                ${c.name.substring(0, 4)}
            </div>
            <span class="text-[11px] font-semibold text-slate-700 truncate max-w-[60px]">${c.name}</span>
        </div>
    `).join('');

    bar.innerHTML = allBtn + catBtns;
}

/* ==========================================
   7. METAL RATES & AUTO PRICE CALCULATION
   ========================================== */
function recalculateMetalRates() {
    const goldBase = parseFloat(document.getElementById('baseGoldRateInput').value) || 0;
    const silverBase = parseFloat(document.getElementById('baseSilverRateInput').value) || 0;

    document.getElementById('dashGoldRate').innerHTML = `₹${goldBase.toLocaleString('en-IN')}<span class="text-[10px] text-slate-500">/10g</span>`;
    document.getElementById('dashSilverRate').innerHTML = `₹${silverBase.toLocaleString('en-IN')}<span class="text-[10px] text-slate-500">/kg</span>`;
    document.getElementById('catGoldDisplay').innerText = `₹${goldBase.toLocaleString('en-IN')}/10g`;
    document.getElementById('catSilverDisplay').innerText = `₹${silverBase.toLocaleString('en-IN')}/kg`;

    autoCalculateProductPrice();
}

async function saveMetalRates() {
    const goldBase = parseFloat(document.getElementById('baseGoldRateInput').value) || 0;
    const silverBase = parseFloat(document.getElementById('baseSilverRateInput').value) || 0;

    const { error } = await supabaseClient
        .from('store_settings')
        .update({ gold_rate_24k: goldBase, silver_rate_kg: silverBase })
        .eq('id', 1);

    if (error) {
        alertBox('Error saving rates!');
        return;
    }
    recalculateMetalRates();
    switchScreen('dashboardScreen');
    alertBox('Metal Rates Saved to Supabase!');
}

function autoCalculateProductPrice() {
    const metalType = document.getElementById('prodMetalType').value;
    const purity = document.getElementById('prodPurity').value;
    const weight = parseFloat(document.getElementById('prodWeight').value) || 0;

    let price = 0;
    if (metalType === 'gold') {
        const goldBase = parseFloat(document.getElementById('baseGoldRateInput').value) || 0;
        let purityFactor = 1;
        if (purity === '22K') purityFactor = 0.9167;
        else if (purity === '18K') purityFactor = 0.75;
        price = Math.round((goldBase / 10) * purityFactor * weight);
    } else {
        const silverBase = parseFloat(document.getElementById('baseSilverRateInput').value) || 0;
        price = Math.round((silverBase / 1000) * weight);
    }

    document.getElementById('prodAutoPrice').value = `₹${price.toLocaleString('en-IN')}`;
}

/* ==========================================
   8. EXCEL LEDGER & FINANCIAL CALCULATOR (SUPABASE)
   ========================================== */
function renderLedgerRowUI(entry, rowCount) {
    const tbody = document.getElementById('ledgerTableBody');
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-100 hover:bg-slate-50";
    tr.dataset.id = entry.id;
    tr.innerHTML = `
        <td class="p-2 border-r border-slate-200 text-center font-medium text-slate-500 row-index">${rowCount}</td>
        <td class="p-2 border-r border-slate-200"><input type="date" value="${entry.entry_date}" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none date-input"></td>
        <td class="p-2 border-r border-slate-200"><input type="text" value="${entry.particulars || ''}" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none part-input" placeholder="Item/Name"></td>
        <td class="p-2 border-r border-slate-200"><input type="number" value="${entry.debit || 0}" oninput="calculateLedgerTotals()" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none debit-input text-rose-600 font-semibold"></td>
        <td class="p-2 border-r border-slate-200"><input type="number" value="${entry.credit || 0}" oninput="calculateLedgerTotals()" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none credit-input font-bold text-emerald-600"></td>
        <td class="p-2 text-center"><button onclick="deleteLedgerRow(${entry.id}, this)" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash-can"></i></button></td>
    `;
    tbody.appendChild(tr);
}

async function addNewLedgerRow() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
        .from('ledger_entries')
        .insert([{ entry_date: today, particulars: '', debit: 0, credit: 0 }])
        .select()
        .single();

    if (error) return alertBox('Error adding row!');

    const tbody = document.getElementById('ledgerTableBody');
    renderLedgerRowUI(data, tbody.rows.length + 1);
    calculateLedgerTotals();
}

async function updateLedgerEntry(id, inputEl) {
    const tr = inputEl.closest('tr');
    const entry_date = tr.querySelector('.date-input').value;
    const particulars = tr.querySelector('.part-input').value;
    const debit = parseFloat(tr.querySelector('.debit-input').value) || 0;
    const credit = parseFloat(tr.querySelector('.credit-input').value) || 0;

    await supabaseClient
        .from('ledger_entries')
        .update({ entry_date, particulars, debit, credit })
        .eq('id', id);
}

async function deleteLedgerRow(id, btn) {
    await supabaseClient.from('ledger_entries').delete().eq('id', id);
    btn.closest('tr').remove();
    const rows = document.querySelectorAll('#ledgerTableBody tr');
    rows.forEach((row, idx) => {
        const indexCell = row.querySelector('.row-index');
        if (indexCell) indexCell.innerText = idx + 1;
    });
    calculateLedgerTotals();
}

function calculateLedgerTotals() {
    const debits = document.querySelectorAll('.debit-input');
    const credits = document.querySelectorAll('.credit-input');

    let totalDebit = 0;
    let totalCredit = 0;

    debits.forEach(input => totalDebit += parseFloat(input.value) || 0);
    credits.forEach(input => totalCredit += parseFloat(input.value) || 0);

    const balance = totalCredit - totalDebit;
    const balanceEl = document.getElementById('totalLedgerBalance');
    if (balanceEl) {
        balanceEl.innerText = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function calcAppend(val) {
    calcExpression += val;
    document.getElementById('calcDisplay').innerText = calcExpression;
}

function calcClear() {
    calcExpression = "";
    document.getElementById('calcDisplay').innerText = "0";
}

function calcBack() {
    calcExpression = calcExpression.slice(0, -1);
    document.getElementById('calcDisplay').innerText = calcExpression || "0";
}

function calcCompute() {
    try {
        if (!calcExpression) return;
        calcExpression = String(eval(calcExpression));
        document.getElementById('calcDisplay').innerText = calcExpression;
    } catch (e) {
        document.getElementById('calcDisplay').innerText = "Error";
        calcExpression = "";
    }
}