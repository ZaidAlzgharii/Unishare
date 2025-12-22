import streamlit as st
import google.generativeai as genai
import os
import tempfile
from PIL import Image

# ==========================================
# 1. إعدادات الصفحة والتصميم (UI/UX)
# ==========================================
st.set_page_config(
    page_title="UniShare AI | المساعد الذكي",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# تخصيص الألوان والخطوط عبر CSS (Slate/Blue Palette)
st.markdown("""
<style>
    [data-testid="stAppViewContainer"] {
        background-color: #f8fafc; /* Slate-50 */
    }
    [data-testid="stSidebar"] {
        background-color: #1e293b; /* Slate-800 */
    }
    .stButton>button {
        background-color: #2563eb; /* Blue-600 */
        color: white;
        border-radius: 8px;
        font-weight: bold;
        border: none;
        padding: 0.5rem 1rem;
        width: 100%;
    }
    .stButton>button:hover {
        background-color: #1d4ed8; /* Blue-700 */
    }
    h1, h2, h3 {
        color: #0f172a; /* Slate-900 */
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .css-1d391kg {
        padding-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. إدارة الحالة واللغة (Context)
# ==========================================
if 'language' not in st.session_state:
    st.session_state.language = 'English'

# نصوص الواجهة (Dictionary for Translations)
ui_text = {
    'English': {
        'title': "UniShare AI Assistant",
        'subtitle': "Upload your notes and let Gemini generate a structured summary.",
        'upload_label': "Upload File (PDF, Image, Audio)",
        'major_label': "Field of Study / Major",
        'type_label': "Document Type",
        'btn_generate': "✨ Generate AI Summary",
        'processing': "Analyzing document structure and content...",
        'success': "Summary Generated Successfully!",
        'error_key': "API Key not found in Secrets.",
        'options_major': ["Computer Science", "Molecular Genetics", "Urban Studies", "Business", "Engineering", "Other"],
        'options_type': ["Lecture Notes", "Summary", "Past Exam", "Assignment", "Cheatsheet"]
    },
    'Arabic': {
        'title': "مساعد UniShare الذكي",
        'subtitle': "ارفع ملفاتك الدراسية ودع الذكاء الاصطناعي يلخصها لك باحترافية.",
        'upload_label': "ارفع الملف (PDF, صورة, صوت)",
        'major_label': "التخصص الدراسي",
        'type_label': "نوع الملف",
        'btn_generate': "✨ توليد الملخص الذكي",
        'processing': "جاري تحليل محتوى الملف وهيكليته...",
        'success': "تم توليد الملخص بنجاح!",
        'error_key': "لم يتم العثور على مفتاح API في الإعدادات.",
        'options_major': ["علوم الحاسوب", "الوراثة الجزيئية", "الدراسات الحضرية", "إدارة أعمال", "هندسة", "أخرى"],
        'options_type': ["ملاحظات محاضرة", "ملخص عام", "امتحان سابق", "واجب/تكليف", "ورقة مراجعة"]
    }
}

# ==========================================
# 3. الشريط الجانبي (Sidebar) والإعدادات
# ==========================================
with st.sidebar:
    st.title("🎓 UniShare")
    
    # Language Switcher
    lang_choice = st.radio(
        "Language / اللغة",
        options=['English', 'Arabic'],
        horizontal=True
    )
    st.session_state.language = lang_choice
    
    t = ui_text[st.session_state.language]
    
    st.markdown("---")
    
    # Inputs for Context
    major = st.selectbox(t['major_label'], t['options_major'])
    doc_type = st.selectbox(t['type_label'], t['options_type'])
    
    st.markdown("---")
    st.caption("Powered by Google Gemini 1.5 Flash")

# ==========================================
# 4. المنطق الرئيسي (Main Logic)
# ==========================================

# التحقق من المفتاح
if "GOOGLE_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
else:
    st.error(t['error_key'])
    st.stop()

# الواجهة الرئيسية
st.title(t['title'])
st.markdown(f"*{t['subtitle']}*")

uploaded_file = st.file_uploader(t['upload_label'], type=['pdf', 'png', 'jpg', 'jpeg', 'mp3', 'wav', 'mp4'])

if uploaded_file and st.button(t['btn_generate']):
    with st.spinner(t['processing']):
        try:
            # 1. حفظ الملف مؤقتاً
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.name.split('.')[-1]}") as tmp:
                tmp.write(uploaded_file.getvalue())
                tmp_path = tmp.name

            # 2. تحديد نوع الملف
            mime_type = uploaded_file.type
            if uploaded_file.name.lower().endswith(".pdf"): mime_type = "application/pdf"
            elif uploaded_file.name.lower().endswith(".mp4"): mime_type = "video/mp4"
            elif uploaded_file.name.lower().endswith((".png", ".jpg")): mime_type = "image/jpeg"

            # 3. رفع الملف إلى Gemini
            myfile = genai.upload_file(tmp_path, mime_type=mime_type)
            
            # انتظار المعالجة (للفيديو والصوت)
            import time
            while myfile.state.name == "PROCESSING":
                time.sleep(2)
                myfile = genai.get_file(myfile.name)

            # 4. إعداد الموديل
            # ملاحظة: نستخدم Gemini 1.5 Flash لأنه الأسرع والأكثر كفاءة للنصوص الطويلة
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            # 5. الأمر (System Prompt) - ذكي ومفصل
            # نطلب منه الرد بنفس لغة الواجهة المختارة
            target_lang = "Arabic" if st.session_state.language == 'Arabic' else "English"
            
            prompt = f"""
            Role: You are a senior university professor and AI tutor for the 'UniShare' platform.
            Task: Analyze the attached {doc_type} file for a student majoring in {major}.
            Output Language: Strictly in **{target_lang}**.
            
            Format your response into these 3 sections using Markdown:
            
            ## 1. 📘 Overview & Core Concepts (نظرة عامة والمفاهيم الأساسية)
            - Provide a high-level summary of the file.
            - List the most critical theories or concepts discussed.
            
            ## 2. 💡 Key Insights & Takeaways (الرؤى الجوهرية)
            - Bullet points of the most important facts.
            - If it's an exam, highlight potential questions.
            - If it's a lecture, highlight what the professor focused on.
            
            ## 3. 🔑 Terminology (المصطلحات)
            - Extract key academic terms mentioned.
            - Provide a brief definition for each.
            
            Tone: Academic, encouraging, and highly structured.
            """

            # 6. التلخيص
            response = model.generate_content([myfile, prompt])
            
            # 7. العرض
            st.success(t['success'])
            
            # عرض النتيجة داخل بطاقة أنيقة
            with st.container():
                st.markdown(response.text)

            # تنظيف
            os.unlink(tmp_path)

        except Exception as e:
            st.error(f"Error: {e}")

# Footer
st.markdown("---")
st.markdown("<div style='text-align: center; color: #64748b;'>UniShare Platform © 2025 | Built with Streamlit & Gemini</div>", unsafe_allow_html=True)
