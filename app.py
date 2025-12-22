import streamlit as st
import google.generativeai as genai
import os
import tempfile

# ==========================================
# 1. إعدادات الصفحة ونظام التصميم (Matching UniShare Theme)
# ==========================================
st.set_page_config(
    page_title="UniShare AI | المساعد الذكي",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# تخصيص CSS ليتطابق مع Tailwind CSS المستخدم في تطبيق React (Slate & Blue theme)
st.markdown("""
<style>
    /* خلفية التطبيق (Slate-50) */
    .stApp {
        background-color: #f8fafc;
        font-family: 'Inter', sans-serif;
    }
    
    /* الشريط الجانبي (Slate-900) */
    [data-testid="stSidebar"] {
        background-color: #0f172a;
    }
    [data-testid="stSidebar"] * {
        color: #e2e8f0 !important; /* Slate-200 text */
    }

    /* الأزرار الرئيسية (Blue-600 hover Blue-700) */
    .stButton>button {
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 0.5rem; /* rounded-lg */
        padding: 0.75rem 1rem;
        font-weight: 600;
        transition: all 0.2s;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
    .stButton>button:hover {
        background-color: #1d4ed8;
        transform: translateY(-1px);
    }
    .stButton>button:active {
        transform: translateY(0);
    }

    /* تحسين شكل النصوص */
    h1, h2, h3 {
        color: #0f172a; /* Slate-900 */
        font-family: 'Inter', sans-serif;
    }
    
    /* حاوية النتائج */
    .result-card {
        background-color: white;
        padding: 2rem;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0; /* Slate-200 */
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        margin-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. الثوابت والبيانات (مأخوذة من constants.ts)
# ==========================================

# قائمة التخصصات كما وردت في ملف constants.ts
MAJORS = [
    'Molecular Genetics Biology',
    'Computer Science',
    'Social Thought, Economy, and Policy (STEP)',
    'Global Studies and Diplomacy',
    'Human Rights and International Law',
    'Literature and Society',
    'Digital Media and Communication',
    'Urban Studies'
]

# ترجمة تقريبية للتخصصات للعرض بالعربية
MAJORS_AR = [
    'الأحياء والوراثة الجزيئية',
    'علوم الحاسوب',
    'الفكر الاجتماعي والاقتصاد والسياسة (STEP)',
    'الدراسات العالمية والدبلوماسية',
    'حقوق الإنسان والقانون الدولي',
    'الأدب والمجتمع',
    'الإعلام الرقمي والاتصال',
    'الدراسات الحضرية'
]

# الفئات (Categories)
CATEGORIES = ['Summary', 'Lecture Notes', 'Past Exam', 'Assignment', 'Cheatsheet']
CATEGORIES_AR = ['ملخص', 'ملاحظات محاضرة', 'امتحان سابق', 'واجب/تكليف', 'ورقة مراجعة']

# قاموس النصوص للواجهة (Matches Translations)
UI_TEXT = {
    'English': {
        'app_title': 'UniShare AI Assistant',
        'app_subtitle': 'Upload your document to generate a structured AI summary.',
        'sidebar_title': 'UniShare',
        'lbl_major': 'Filter by Major',
        'lbl_category': 'Category',
        'lbl_upload': 'Upload Note (PDF, Image, Audio)',
        'btn_generate': '✨ Generate AI Summary',
        'msg_processing': 'Analyzing document structure...',
        'msg_success': 'Summary generated successfully!',
        'err_api': 'API Key not found. Please check Secrets.',
        'section_overview': 'Overview & Core Concepts',
        'section_insights': 'Key Insights & Takeaways',
        'section_terms': 'Terminology'
    },
    'Arabic': {
        'app_title': 'مساعد UniShare الذكي',
        'app_subtitle': 'ارفع ملفك لتوليد ملخص منظم ودقيق باستخدام الذكاء الاصطناعي.',
        'sidebar_title': 'يوني شير',
        'lbl_major': 'تصفية حسب التخصص',
        'lbl_category': 'الفئة',
        'lbl_upload': 'رفع ملاحظة (PDF, صورة, صوت)',
        'btn_generate': '✨ توليد الملخص',
        'msg_processing': 'جاري تحليل محتوى الملف...',
        'msg_success': 'تم توليد الملخص بنجاح!',
        'err_api': 'مفتاح API غير موجود. يرجى التحقق من الإعدادات.',
        'section_overview': 'نظرة عامة والمفاهيم الأساسية',
        'section_insights': 'الرؤى الجوهرية وأهم النقاط',
        'section_terms': 'المصطلحات العلمية'
    }
}

# ==========================================
# 3. إدارة الحالة والشريط الجانبي
# ==========================================
if 'language' not in st.session_state:
    st.session_state.language = 'English'

with st.sidebar:
    # يمكنك وضع شعار UniShare هنا إذا كان لديك رابط صورة
    st.markdown(f"## 🎓 {UI_TEXT[st.session_state.language]['sidebar_title']}")
    
    # مبدل اللغة
    lang = st.radio("Language / اللغة", ["English", "Arabic"], horizontal=True)
    st.session_state.language = lang
    t = UI_TEXT[lang]
    
    st.markdown("---")
    
    # اختيار التخصص والفئة (السياق للذكاء الاصطناعي)
    if lang == 'English':
        selected_major = st.selectbox(t['lbl_major'], MAJORS)
        selected_category = st.selectbox(t['lbl_category'], CATEGORIES)
    else:
        selected_major = st.selectbox(t['lbl_major'], MAJORS_AR)
        selected_category = st.selectbox(t['lbl_category'], CATEGORIES_AR)

    st.markdown("---")
    st.caption("Powered by Google Gemini 1.5 Flash")

# ==========================================
# 4. المنطق الرئيسي للتطبيق
# ==========================================

# إعداد مفتاح API
if "GOOGLE_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
else:
    st.error(t['err_api'])
    st.stop()

# العنوان الرئيسي
st.title(t['app_title'])
st.markdown(f"<p style='color: #64748b; font-size: 1.1rem;'>{t['app_subtitle']}</p>", unsafe_allow_html=True)
st.markdown("---")

# رفع الملفات
uploaded_file = st.file_uploader(t['lbl_upload'], type=['pdf', 'png', 'jpg', 'jpeg', 'mp4', 'mp3', 'wav', 'm4a'])

if uploaded_file and st.button(t['btn_generate'], use_container_width=True):
    with st.spinner(t['msg_processing']):
        try:
            # 1. إنشاء ملف مؤقت للمعالجة
            suffix = f".{uploaded_file.name.split('.')[-1]}"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(uploaded_file.getvalue())
                tmp_path = tmp.name

            # 2. تحديد نوع الملف (MIME Type)
            mime_type = uploaded_file.type
            if not mime_type:
                # تخمين النوع إذا لم يوفره المتصفح
                ext = suffix.lower()
                if ext == '.pdf': mime_type = 'application/pdf'
                elif ext in ['.jpg', '.jpeg', '.png']: mime_type = 'image/jpeg'
                elif ext == '.mp4': mime_type = 'video/mp4'
                elif ext in ['.mp3', '.wav', '.m4a']: mime_type = 'audio/mp3'

            # 3. رفع الملف إلى Gemini
            myfile = genai.upload_file(tmp_path, mime_type=mime_type)
            
            # انتظار المعالجة (ضروري لملفات الفيديو والصوت)
            import time
            while myfile.state.name == "PROCESSING":
                time.sleep(2)
                myfile = genai.get_file(myfile.name)

            # 4. توليد المحتوى
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            # هندسة الأمر (Prompt Engineering) ليتوافق مع UniShare
            target_lang_name = "Arabic" if lang == "Arabic" else "English"
            
            system_prompt = f"""
            Role: You are an expert academic tutor for the UniShare platform.
            Context: The student is majoring in '{selected_major}' and this file is categorized as '{selected_category}'.
            Task: Analyze the uploaded file and generate a structured summary in **{target_lang_name}**.
            
            Strict Output Format (Use Markdown):
            
            ### 1. {t['section_overview']}
            - Provide a concise summary of the document's main topic.
            - Identify the central thesis or goal.

            ### 2. {t['section_insights']}
            - List 5-7 critical bullet points.
            - Focus on facts, formulas, theories, dates, or exam-relevant details.
            
            ### 3. {t['section_terms']}
            - Extract key academic or technical terms found in the text.
            - Format: **Term**: Definition.
            
            Tone: Academic, encouraging, and professional.
            """

            response = model.generate_content([myfile, system_prompt])
            
            # 5. عرض النتيجة
            st.success(t['msg_success'])
            
            # عرض النتيجة داخل بطاقة منسقة
            st.markdown(f"""
            <div class="result-card">
                {response.text}
            </div>
            """, unsafe_allow_html=True)

            # تنظيف الملفات المؤقتة
            os.unlink(tmp_path)

        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
