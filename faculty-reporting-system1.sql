--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: set_last_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_last_updated() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_last_updated() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    key text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    revoked boolean DEFAULT false
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_id_seq OWNER TO postgres;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    report_id integer,
    file_path text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attachments_id_seq OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_ids integer[] NOT NULL,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: class_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_enrollments (
    student_id integer NOT NULL,
    class_id integer NOT NULL,
    enrolled_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.class_enrollments OWNER TO postgres;

--
-- Name: class_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_ratings (
    id integer NOT NULL,
    student_id integer NOT NULL,
    course_id integer NOT NULL,
    lecturer_id integer NOT NULL,
    rating integer NOT NULL,
    comments text,
    class_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT class_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.class_ratings OWNER TO postgres;

--
-- Name: class_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_ratings_id_seq OWNER TO postgres;

--
-- Name: class_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_ratings_id_seq OWNED BY public.class_ratings.id;


--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id integer NOT NULL,
    course_id integer NOT NULL,
    class_code text NOT NULL,
    capacity integer DEFAULT 60,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: classes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classes_id_seq OWNER TO postgres;

--
-- Name: classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classes_id_seq OWNED BY public.classes.id;


--
-- Name: course_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_assignments (
    id integer NOT NULL,
    course_id integer NOT NULL,
    module_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.course_assignments OWNER TO postgres;

--
-- Name: course_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_assignments_id_seq OWNER TO postgres;

--
-- Name: course_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_assignments_id_seq OWNED BY public.course_assignments.id;


--
-- Name: course_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_materials (
    id integer NOT NULL,
    course_id integer NOT NULL,
    title text NOT NULL,
    url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.course_materials OWNER TO postgres;

--
-- Name: course_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_materials_id_seq OWNER TO postgres;

--
-- Name: course_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_materials_id_seq OWNED BY public.course_materials.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    course_name character varying(100) NOT NULL,
    course_code character varying(20) NOT NULL,
    stream_id integer NOT NULL,
    credits integer DEFAULT 3,
    semester integer NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id integer NOT NULL,
    report_id integer NOT NULL,
    feedback_from_id integer NOT NULL,
    feedback_to_id integer NOT NULL,
    feedback_content text NOT NULL,
    feedback_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['approval'::text, 'rejection'::text, 'suggestion'::text, 'clarification'::text])))
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_id_seq OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: lecturer_classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturer_classes (
    lecturer_id integer NOT NULL,
    class_id integer NOT NULL
);


ALTER TABLE public.lecturer_classes OWNER TO postgres;

--
-- Name: lecturer_courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturer_courses (
    id integer NOT NULL,
    lecturer_id integer NOT NULL,
    course_id integer NOT NULL,
    academic_year character varying(10) NOT NULL,
    semester integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lecturer_courses OWNER TO postgres;

--
-- Name: lecturer_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lecturer_courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lecturer_courses_id_seq OWNER TO postgres;

--
-- Name: lecturer_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lecturer_courses_id_seq OWNED BY public.lecturer_courses.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules (
    id integer NOT NULL,
    module_code text NOT NULL,
    module_name text NOT NULL
);


ALTER TABLE public.modules OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modules_id_seq OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;


--
-- Name: monitoring; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monitoring (
    id integer NOT NULL,
    event_type text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.monitoring OWNER TO postgres;

--
-- Name: monitoring_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.monitoring_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.monitoring_id_seq OWNER TO postgres;

--
-- Name: monitoring_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.monitoring_id_seq OWNED BY public.monitoring.id;


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: faculty_reporting_system
--

CREATE TABLE public.notification_reads (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    source_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notification_reads OWNER TO faculty_reporting_system;

--
-- Name: notification_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: faculty_reporting_system
--

CREATE SEQUENCE public.notification_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_reads_id_seq OWNER TO faculty_reporting_system;

--
-- Name: notification_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: faculty_reporting_system
--

ALTER SEQUENCE public.notification_reads_id_seq OWNED BY public.notification_reads.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    title text,
    message text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: progress_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.progress_tracking (
    id integer NOT NULL,
    student_id integer NOT NULL,
    course_id integer NOT NULL,
    completion_percentage numeric(5,2) DEFAULT 0.00,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.progress_tracking OWNER TO postgres;

--
-- Name: progress_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.progress_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.progress_tracking_id_seq OWNER TO postgres;

--
-- Name: progress_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.progress_tracking_id_seq OWNED BY public.progress_tracking.id;


--
-- Name: report_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_attachments (
    id integer NOT NULL,
    report_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100),
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_attachments OWNER TO postgres;

--
-- Name: report_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_attachments_id_seq OWNER TO postgres;

--
-- Name: report_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_attachments_id_seq OWNED BY public.report_attachments.id;


--
-- Name: report_workflow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_workflow (
    id integer NOT NULL,
    report_id integer NOT NULL,
    current_stage text,
    assigned_to_role text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.report_workflow OWNER TO postgres;

--
-- Name: report_workflow_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_workflow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_workflow_id_seq OWNER TO postgres;

--
-- Name: report_workflow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_workflow_id_seq OWNED BY public.report_workflow.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    reporter_id integer NOT NULL,
    report_type text NOT NULL,
    course_id integer,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    attendance_count integer,
    topic_covered text,
    learning_outcomes text,
    challenges text,
    recommendations text,
    rating integer,
    status text DEFAULT 'submitted'::text NOT NULL,
    submitted_to_role text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reports_report_type_check CHECK ((report_type = ANY (ARRAY['student_report'::text, 'lecturer_report'::text, 'progress_report'::text, 'feedback_report'::text]))),
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT reports_submitted_to_role_check CHECK ((submitted_to_role = ANY (ARRAY['lecturer'::text, 'program_leader'::text, 'principal_lecturer'::text, 'faculty_manager'::text])))
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role text NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: streams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.streams (
    id integer NOT NULL,
    stream_name character varying(100) NOT NULL,
    stream_code character varying(10) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.streams OWNER TO postgres;

--
-- Name: streams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.streams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.streams_id_seq OWNER TO postgres;

--
-- Name: streams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.streams_id_seq OWNED BY public.streams.id;


--
-- Name: student_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_enrollments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    course_id integer NOT NULL,
    academic_year character varying(10) NOT NULL,
    semester integer NOT NULL,
    enrollment_date timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_enrollments OWNER TO postgres;

--
-- Name: student_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_enrollments_id_seq OWNER TO postgres;

--
-- Name: student_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_enrollments_id_seq OWNED BY public.student_enrollments.id;


--
-- Name: student_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_modules (
    id integer NOT NULL,
    student_id integer NOT NULL,
    module_id integer NOT NULL,
    enrolled_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_modules OWNER TO postgres;

--
-- Name: student_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_modules_id_seq OWNER TO postgres;

--
-- Name: student_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_modules_id_seq OWNED BY public.student_modules.id;


--
-- Name: user_streams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_streams (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stream_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_streams OWNER TO postgres;

--
-- Name: user_streams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_streams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_streams_id_seq OWNER TO postgres;

--
-- Name: user_streams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_streams_id_seq OWNED BY public.user_streams.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role text NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    phone character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['student'::text, 'lecturer'::text, 'program_leader'::text, 'principal_lecturer'::text, 'faculty_manager'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: class_ratings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_ratings ALTER COLUMN id SET DEFAULT nextval('public.class_ratings_id_seq'::regclass);


--
-- Name: classes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes ALTER COLUMN id SET DEFAULT nextval('public.classes_id_seq'::regclass);


--
-- Name: course_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments ALTER COLUMN id SET DEFAULT nextval('public.course_assignments_id_seq'::regclass);


--
-- Name: course_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_materials ALTER COLUMN id SET DEFAULT nextval('public.course_materials_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: lecturer_courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_courses ALTER COLUMN id SET DEFAULT nextval('public.lecturer_courses_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- Name: monitoring id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitoring ALTER COLUMN id SET DEFAULT nextval('public.monitoring_id_seq'::regclass);


--
-- Name: notification_reads id; Type: DEFAULT; Schema: public; Owner: faculty_reporting_system
--

ALTER TABLE ONLY public.notification_reads ALTER COLUMN id SET DEFAULT nextval('public.notification_reads_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: progress_tracking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_tracking ALTER COLUMN id SET DEFAULT nextval('public.progress_tracking_id_seq'::regclass);


--
-- Name: report_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_attachments ALTER COLUMN id SET DEFAULT nextval('public.report_attachments_id_seq'::regclass);


--
-- Name: report_workflow id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_workflow ALTER COLUMN id SET DEFAULT nextval('public.report_workflow_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: streams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streams ALTER COLUMN id SET DEFAULT nextval('public.streams_id_seq'::regclass);


--
-- Name: student_enrollments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollments ALTER COLUMN id SET DEFAULT nextval('public.student_enrollments_id_seq'::regclass);


--
-- Name: student_modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_modules ALTER COLUMN id SET DEFAULT nextval('public.student_modules_id_seq'::regclass);


--
-- Name: user_streams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_streams ALTER COLUMN id SET DEFAULT nextval('public.user_streams_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_keys (id, user_id, key, created_at, revoked) FROM stdin;
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attachments (id, report_id, file_path, uploaded_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, target_type, target_ids, meta, created_at) FROM stdin;
1	18	resetPassword	user	{126}	{"length": 12}	2025-10-05 23:41:09.054469+02
\.


--
-- Data for Name: class_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_enrollments (student_id, class_id, enrolled_at) FROM stdin;
2	4	2025-10-03 17:01:45.615905
1	5	2025-10-03 17:01:45.615905
10	9	2025-10-03 17:01:45.615905
1	10	2025-10-03 17:01:45.615905
2	11	2025-10-03 17:01:45.615905
123	5	2025-10-03 17:34:47.172387
122	5	2025-10-03 17:45:53.366241
54	6	2025-10-03 19:25:09.848748
37	3	2025-10-03 19:25:09.848748
10	11	2025-10-03 19:25:09.848748
59	10	2025-10-03 19:25:09.848748
123	11	2025-10-03 19:25:09.848748
29	13	2025-10-03 19:25:09.848748
56	7	2025-10-03 19:25:09.848748
36	2	2025-10-03 19:25:09.848748
19	9	2025-10-03 19:25:09.848748
55	12	2025-10-03 19:25:09.848748
124	9	2025-10-03 19:25:09.848748
58	8	2025-10-03 19:25:09.848748
30	4	2025-10-03 19:25:09.848748
2	5	2025-10-03 19:25:09.848748
57	1	2025-10-03 19:25:09.848748
125	13	2025-10-03 19:25:09.848748
\.


--
-- Data for Name: class_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_ratings (id, student_id, course_id, lecturer_id, rating, comments, class_date, created_at) FROM stdin;
1	1	1	3	4	Clear intro lecture	2025-09-23	2025-10-03 15:26:34.575752+02
2	2	3	4	5	Great demo of responsive layouts	2025-09-26	2025-10-03 15:26:34.575752+02
3	10	4	13	3	Interesting but fast pace	2025-09-28	2025-10-03 15:26:34.575752+02
10	1	1	3	5	\N	2025-10-03	2025-10-03 17:16:52.698138+02
11	1	1	3	5	\N	2025-10-03	2025-10-03 17:22:06.911454+02
12	123	2	121	5	\N	2025-10-02	2025-10-03 17:36:08.148347+02
31	1	7	7	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
32	1	12	48	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
33	1	11	28	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
34	1	13	20	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
35	1	10	34	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
36	1	12	18	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
37	1	3	5	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
38	1	4	13	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
39	1	13	27	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
40	1	11	17	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
41	1	3	4	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
42	1	4	6	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
43	1	4	110	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
44	1	2	121	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
45	1	20	32	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
46	1	13	49	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
47	1	7	120	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
48	1	11	35	5	\N	2025-10-02	2025-10-03 19:26:27.345688+02
49	19	4	13	3	impv	2025-10-03	2025-10-03 20:52:19.977249+02
50	19	4	27	5	\N	2025-10-03	2025-10-03 20:52:53.62003+02
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classes (id, course_id, class_code, capacity, created_at) FROM stdin;
1	20	C-PRL402-A	60	2025-10-03 16:56:42.666543
2	11	C-CS102-A	60	2025-10-03 16:56:42.666543
3	12	C-DS301-A	60	2025-10-03 16:56:42.666543
4	10	C-IT301-A	60	2025-10-03 16:56:42.666543
5	2	C-CS201-A	60	2025-10-03 16:56:42.666543
6	13	C-CS301-A	60	2025-10-03 16:56:42.666543
7	19	C-PRL401-A	60	2025-10-03 16:56:42.666543
8	38	C-IT401-A	60	2025-10-03 16:56:42.666543
9	4	C-BIT301-A	60	2025-10-03 16:56:42.666543
10	1	C-CS101-A	60	2025-10-03 16:56:42.666543
11	3	C-IT201-A	60	2025-10-03 16:56:42.666543
12	14	C-IT302-A	60	2025-10-03 16:56:42.666543
13	7	C-CS202-A	60	2025-10-03 16:56:42.666543
\.


--
-- Data for Name: course_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_assignments (id, course_id, module_id, assigned_at) FROM stdin;
1	1	1	2025-10-03 17:17:51.031719
\.


--
-- Data for Name: course_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_materials (id, course_id, title, url, created_at) FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, course_name, course_code, stream_id, credits, semester, description, created_at) FROM stdin;
1	Programming Fundamentals	CS101	1	3	1	\N	2025-10-03 15:22:15.001483+02
2	Database Systems	CS201	1	3	2	\N	2025-10-03 15:22:15.001483+02
3	Web Development	IT201	2	3	2	\N	2025-10-03 15:22:15.001483+02
4	System Analysis	BIT301	3	3	3	\N	2025-10-03 15:22:15.001483+02
7	Algorithms & Data Structures	CS202	1	4	3	Core algorithms and data structures	2025-10-03 15:26:34.575752+02
10	IT Project Management	IT301	2	3	3	PM for IT projects	2025-10-03 15:26:34.575752+02
11	Databases	CS102	1	3	1	\N	2025-10-03 15:50:58.671025+02
12	Machine Learning	DS301	7	3	1	\N	2025-10-03 15:50:58.677844+02
13	Advanced Algorithms	CS301	1	4	3	\N	2025-10-03 16:20:02.779848+02
14	Systems Design	IT302	2	3	3	\N	2025-10-03 16:20:02.779848+02
19	Research Supervision	PRL401	1	3	1	\N	2025-10-03 16:24:55.120938+02
20	Teaching Quality Review	PRL402	2	3	2	\N	2025-10-03 16:24:55.120938+02
38	Information Security	IT401	2	3	4	\N	2025-10-03 16:49:18.488259+02
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback (id, report_id, feedback_from_id, feedback_to_id, feedback_content, feedback_type, created_at) FROM stdin;
1	1	3	1	Good start. Please include screenshots next time.	suggestion	2025-10-03 15:26:34.575752+02
2	2	5	3	Reviewed and approved. Proceed with milestone 1.	approval	2025-10-03 15:26:34.575752+02
3	6	5	20	Well documented. Please attach supporting evidence for observations.	suggestion	2025-10-03 16:26:02.404819+02
4	17	5	6	Well documented. Please attach evidence.	suggestion	2025-10-03 16:50:32.638033+02
5	23	5	6	Well documented. Please attach evidence.	suggestion	2025-10-03 17:11:14.780999+02
6	23	5	6	Well documented. Please attach evidence.	suggestion	2025-10-03 17:12:42.502742+02
7	27	5	6	Well documented. Please attach evidence.	suggestion	2025-10-03 17:18:42.291207+02
8	32	5	121	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 17:36:33.610349+02
9	33	5	3	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
10	34	5	4	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
11	35	5	5	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
12	36	5	6	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
13	37	5	7	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
14	38	5	13	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
15	39	5	17	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
16	40	5	18	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
17	41	5	20	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
18	42	5	27	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
19	43	5	28	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
20	44	5	32	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
21	45	5	34	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
22	46	5	35	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
23	47	5	48	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
24	48	5	49	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
25	49	5	110	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
26	50	5	120	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
27	51	5	121	Thanks for the update. Please attach the attendance sheet as evidence.	suggestion	2025-10-03 19:25:56.884345+02
\.


--
-- Data for Name: lecturer_classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lecturer_classes (lecturer_id, class_id) FROM stdin;
3	1
4	2
13	3
27	4
28	5
34	6
35	7
48	8
49	9
121	5
121	11
\.


--
-- Data for Name: lecturer_courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lecturer_courses (id, lecturer_id, course_id, academic_year, semester, created_at) FROM stdin;
1	3	1	2025	1	2025-10-03 15:26:34.575752+02
2	3	2	2025	2	2025-10-03 15:26:34.575752+02
3	4	3	2025	2	2025-10-03 15:26:34.575752+02
4	4	10	2025	3	2025-10-03 15:26:34.575752+02
5	13	4	2025	3	2025-10-03 15:26:34.575752+02
6	3	13	2025	3	2025-10-03 16:20:02.779848+02
7	4	14	2025	3	2025-10-03 16:20:02.779848+02
8	3	13	2025	3	2025-10-03 16:25:14.058316+02
9	4	14	2025	3	2025-10-03 16:25:14.058316+02
11	27	13	2025	3	2025-10-03 16:33:58.945992+02
12	3	13	2025	3	2025-10-03 16:35:25.842866+02
13	4	14	2025	3	2025-10-03 16:35:45.8261+02
14	28	11	2025	1	2025-10-03 16:39:16.988718+02
15	28	7	2025	1	2025-10-03 16:39:21.868531+02
16	28	3	2025	1	2025-10-03 16:39:26.982328+02
17	27	10	2025	1	2025-10-03 16:39:35.887271+02
18	27	14	2025	4	2025-10-03 16:39:45.316766+02
20	3	2	2025	2	2025-10-03 16:43:30.624614+02
21	3	1	2025	1	2025-10-03 16:49:37.54103+02
22	4	2	2025	1	2025-10-03 16:49:37.54103+02
23	13	3	2025	1	2025-10-03 16:49:37.54103+02
24	27	4	2025	1	2025-10-03 16:49:37.54103+02
25	28	7	2025	1	2025-10-03 16:49:37.54103+02
26	34	10	2025	1	2025-10-03 16:49:37.54103+02
27	35	11	2025	1	2025-10-03 16:49:37.54103+02
28	48	12	2025	1	2025-10-03 16:49:37.54103+02
29	49	13	2025	1	2025-10-03 16:49:37.54103+02
39	3	1	2025	1	2025-10-03 16:58:12.342765+02
40	4	2	2025	1	2025-10-03 16:58:12.342765+02
41	13	3	2025	1	2025-10-03 16:58:12.342765+02
42	27	4	2025	1	2025-10-03 16:58:12.342765+02
43	28	7	2025	1	2025-10-03 16:58:12.342765+02
44	34	10	2025	1	2025-10-03 16:58:12.342765+02
45	35	11	2025	1	2025-10-03 16:58:12.342765+02
46	48	12	2025	1	2025-10-03 16:58:12.342765+02
47	49	13	2025	1	2025-10-03 16:58:12.342765+02
48	48	19	2025	1	2025-10-03 17:03:20.546861+02
49	3	1	2025	1	2025-10-03 17:08:38.721582+02
50	4	2	2025	1	2025-10-03 17:08:38.721582+02
51	13	3	2025	1	2025-10-03 17:08:38.721582+02
52	27	4	2025	1	2025-10-03 17:08:38.721582+02
53	28	7	2025	1	2025-10-03 17:08:38.721582+02
54	34	10	2025	1	2025-10-03 17:08:38.721582+02
55	35	11	2025	1	2025-10-03 17:08:38.721582+02
56	48	12	2025	1	2025-10-03 17:08:38.721582+02
57	49	13	2025	1	2025-10-03 17:08:38.721582+02
59	121	2	2025	2	2025-10-03 17:32:33.253008+02
60	121	3	2025	2	2025-10-03 17:43:11.700032+02
62	7	7	2025	2	2025-10-03 19:23:32.885652+02
63	35	1	2025	2	2025-10-03 19:23:32.885652+02
64	34	38	2025	2	2025-10-03 19:23:32.885652+02
65	48	2	2025	2	2025-10-03 19:23:32.885652+02
66	20	13	2025	2	2025-10-03 19:23:32.885652+02
67	49	3	2025	2	2025-10-03 19:23:32.885652+02
68	18	12	2025	2	2025-10-03 19:23:32.885652+02
69	5	3	2025	2	2025-10-03 19:23:32.885652+02
70	17	11	2025	2	2025-10-03 19:23:32.885652+02
71	28	19	2025	2	2025-10-03 19:23:32.885652+02
72	13	10	2025	2	2025-10-03 19:23:32.885652+02
73	6	4	2025	2	2025-10-03 19:23:32.885652+02
74	110	4	2025	2	2025-10-03 19:23:32.885652+02
75	121	10	2025	2	2025-10-03 19:23:32.885652+02
76	32	20	2025	2	2025-10-03 19:23:32.885652+02
77	120	7	2025	2	2025-10-03 19:23:32.885652+02
78	120	3	2025	3	2025-10-03 21:11:54.893688+02
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modules (id, module_code, module_name) FROM stdin;
1	MOD101	Orientation
2	MOD201	Academic Writing
\.


--
-- Data for Name: monitoring; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monitoring (id, event_type, description, created_at) FROM stdin;
1	ingest	Seed job executed	2025-10-03 17:22:55.241532
\.


--
-- Data for Name: notification_reads; Type: TABLE DATA; Schema: public; Owner: faculty_reporting_system
--

COPY public.notification_reads (id, user_id, type, source_id, created_at) FROM stdin;
1	18	feedback	16	2025-10-05 23:14:57.206353+02
2	20	new_report	52	2025-10-07 16:12:11.140789+02
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, read, created_at) FROM stdin;
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: progress_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.progress_tracking (id, student_id, course_id, completion_percentage, last_updated) FROM stdin;
2	1	2	10.00	2025-10-03 15:26:34.575752+02
3	2	3	55.50	2025-10-03 15:26:34.575752+02
4	2	10	20.00	2025-10-03 15:26:34.575752+02
5	10	4	15.00	2025-10-03 15:26:34.575752+02
1	1	1	60.00	2025-10-03 17:21:45.150735+02
6	1	1	60.00	2025-10-03 17:21:45.150735+02
7	1	1	60.00	2025-10-05 18:22:25.837872+02
\.


--
-- Data for Name: report_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_attachments (id, report_id, file_name, file_path, file_size, mime_type, uploaded_at) FROM stdin;
1	1	week1_notes.pdf	/files/reports/week1_notes.pdf	245760	application/pdf	2025-10-03 15:26:34.575752+02
2	2	kickoff_slides.pptx	/files/reports/kickoff_slides.pptx	1048576	application/vnd.openxmlformats-officedocument.presentationml.presentation	2025-10-03 15:26:34.575752+02
\.


--
-- Data for Name: report_workflow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_workflow (id, report_id, current_stage, assigned_to_role, updated_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, reporter_id, report_type, course_id, title, content, attendance_count, topic_covered, learning_outcomes, challenges, recommendations, rating, status, submitted_to_role, created_at, updated_at) FROM stdin;
1	1	student_report	1	Week 1 Attendance & Intro	Covered basics of Python and IDE setup.	45	Intro to Python	Understand variables and I/O	IDE issues on lab PCs	Extend lab time next week	4	submitted	lecturer	2025-10-03 15:26:34.575752+02	2025-10-03 15:26:34.575752+02
2	3	lecturer_report	2	Project Kickoff	Introduced database project and milestones.	\N	ER modeling	Recognize entities/relationships	Group formation delays	Auto-assign groups next term	5	reviewed	program_leader	2025-10-03 15:26:34.575752+02	2025-10-03 15:26:34.575752+02
3	2	student_report	3	Responsive Design Lab	Practiced Flexbox and Grid.	38	CSS layout techniques	Build responsive layout	Browser inconsistencies	Standardize on Chrome in labs	5	submitted	lecturer	2025-10-03 15:26:34.575752+02	2025-10-03 15:26:34.575752+02
4	3	lecturer_report	13	Midterm Review	Midterm progress and challenges	\N	\N	\N	\N	\N	4	submitted	principal_lecturer	2025-10-03 16:20:02.779848+02	2025-10-03 16:20:02.779848+02
5	3	lecturer_report	14	Design Patterns Wrap-up	Summary of patterns covered	\N	\N	\N	\N	\N	5	approved	principal_lecturer	2025-09-30 16:20:02.779848+02	2025-10-03 16:20:02.779848+02
6	20	lecturer_report	19	Supervision Summary	Summary of postgraduate supervision activities this week.	\N	\N	\N	\N	\N	4	submitted	principal_lecturer	2025-10-02 16:25:37.491318+02	2025-10-02 16:25:37.491318+02
7	20	lecturer_report	20	Teaching Quality Review Notes	Initial findings from lecture observations.	\N	\N	\N	\N	\N	5	approved	principal_lecturer	2025-09-30 16:25:37.491318+02	2025-09-30 16:25:37.491318+02
8	3	lecturer_report	20	Weekly Teaching Report	Covered modules and student engagement updates.	\N	\N	\N	\N	\N	\N	submitted	principal_lecturer	2025-10-03 16:26:23.079523+02	2025-10-03 16:26:23.079523+02
10	3	lecturer_report	3	Midterm Coverage	Topics covered and attendance summary	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 16:43:44.386614+02	2025-10-03 16:43:44.386614+02
13	35	lecturer_report	2	Project Milestone Review	Milestone outcomes and risks	\N	\N	\N	\N	\N	4	approved	program_leader	2025-10-01 16:44:02.185701+02	2025-10-01 16:44:02.185701+02
15	3	lecturer_report	2	Midterm Coverage	Topics & attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 16:50:13.668723+02	2025-10-03 16:50:13.668723+02
16	49	lecturer_report	3	Milestone Review	Outcomes & risks	\N	\N	\N	\N	\N	4	approved	program_leader	2025-10-01 16:50:13.668723+02	2025-10-01 16:50:13.668723+02
17	6	lecturer_report	38	Supervision Summary	Weekly supervision	\N	\N	\N	\N	\N	5	submitted	principal_lecturer	2025-10-02 16:50:19.43916+02	2025-10-02 16:50:19.43916+02
18	1	student_report	1	Lab Attendance	Attended lab	\N	\N	\N	\N	\N	\N	submitted	\N	2025-10-01 16:50:26.458101+02	2025-10-01 16:50:26.458101+02
19	59	student_report	1	Project Progress	Initial ERD done	\N	\N	\N	\N	\N	\N	approved	\N	2025-09-28 16:50:26.458101+02	2025-09-28 16:50:26.458101+02
20	32	student_report	\N	missing	misas	\N	\N	\N	\N	\N	\N	draft	principal_lecturer	2025-10-03 16:59:22.86874+02	2025-10-03 16:59:22.86874+02
21	3	lecturer_report	2	Midterm Coverage	Topics & attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 17:10:22.362893+02	2025-10-03 17:10:22.362893+02
22	49	lecturer_report	3	Milestone Review	Outcomes & risks	\N	\N	\N	\N	\N	4	approved	program_leader	2025-10-01 17:10:22.362893+02	2025-10-01 17:10:22.362893+02
23	6	lecturer_report	38	Supervision Summary	Weekly supervision	\N	\N	\N	\N	\N	5	submitted	principal_lecturer	2025-10-02 17:10:53.192986+02	2025-10-02 17:10:53.192986+02
24	3	lecturer_report	1	Weekly Teaching Report	Coverage & engagement	\N	\N	\N	\N	\N	\N	submitted	principal_lecturer	2025-10-03 17:10:56.970766+02	2025-10-03 17:10:56.970766+02
25	3	lecturer_report	2	Midterm Coverage	Topics & attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 17:18:17.051954+02	2025-10-03 17:18:17.051954+02
26	49	lecturer_report	3	Milestone Review	Outcomes & risks	\N	\N	\N	\N	\N	4	approved	program_leader	2025-10-01 17:18:17.051954+02	2025-10-01 17:18:17.051954+02
27	6	lecturer_report	38	Supervision Summary	Weekly supervision	\N	\N	\N	\N	\N	5	submitted	principal_lecturer	2025-10-02 17:18:17.051954+02	2025-10-02 17:18:17.051954+02
28	3	lecturer_report	1	Weekly Teaching Report	Coverage & engagement	\N	\N	\N	\N	\N	\N	submitted	principal_lecturer	2025-10-03 17:18:17.051954+02	2025-10-03 17:18:17.051954+02
29	1	student_report	1	Lab Attendance	Attended lab	\N	\N	\N	\N	\N	\N	submitted	\N	2025-10-01 17:18:42.291207+02	2025-10-01 17:18:42.291207+02
30	59	student_report	1	Project Progress	Initial ERD done	\N	\N	\N	\N	\N	\N	approved	\N	2025-09-28 17:18:42.291207+02	2025-09-28 17:18:42.291207+02
32	121	lecturer_report	2	Weekly Coverage (CS201)	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 17:35:37.087749+02	2025-10-03 17:35:37.087749+02
33	3	lecturer_report	1	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
34	4	lecturer_report	3	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
35	5	lecturer_report	3	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
36	6	lecturer_report	4	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
37	7	lecturer_report	7	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
38	13	lecturer_report	4	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
39	17	lecturer_report	11	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
40	18	lecturer_report	12	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
41	20	lecturer_report	13	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
42	27	lecturer_report	13	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
43	28	lecturer_report	11	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
44	32	lecturer_report	20	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
45	34	lecturer_report	10	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
46	35	lecturer_report	11	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
47	48	lecturer_report	12	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
48	49	lecturer_report	13	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
49	110	lecturer_report	4	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
50	120	lecturer_report	7	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
51	121	lecturer_report	2	Weekly Coverage	Topics covered and attendance	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 19:25:34.122271+02	2025-10-03 19:25:34.122271+02
52	120	lecturer_report	7	CS202 • Principles of Accounting	Faculty: FICT\nClass: Business IT\nWeek: 2025-W38\nDate of Lecture: 2025-10-20\nCourse: Algorithms & Data Structures (CS202)\nLecturer: Obed Tjabafu\nStudents Present: 1 / 1\nVenue: Lecture 5\nScheduled Time: 22:45\nTopic Taught: Principles of Accounting\nLearning Outcomes: outcomings\nRecommendations: learn all\n	\N	\N	\N	\N	\N	\N	submitted	program_leader	2025-10-03 20:44:17.186498+02	2025-10-03 20:44:17.186498+02
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (role) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value) FROM stdin;
\.


--
-- Data for Name: streams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.streams (id, stream_name, stream_code, description, created_at) FROM stdin;
1	Computer Science	CS	Computer Science and Programming	2025-10-03 15:22:15.001483+02
2	Information Technology	IT	Information Technology and Systems	2025-10-03 15:22:15.001483+02
3	Business Information Technology	BIT	Business and IT Integration	2025-10-03 15:22:15.001483+02
7	Data Science	DS	\N	2025-10-03 15:50:58.660533+02
\.


--
-- Data for Name: student_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_enrollments (id, student_id, course_id, academic_year, semester, enrollment_date) FROM stdin;
1	1	1	2025	1	2025-10-03 15:26:34.575752+02
2	1	2	2025	2	2025-10-03 15:26:34.575752+02
3	2	3	2025	2	2025-10-03 15:26:34.575752+02
4	2	10	2025	3	2025-10-03 15:26:34.575752+02
5	10	4	2025	3	2025-10-03 15:26:34.575752+02
9	123	2	2025	2	2025-10-03 17:34:00.463972+02
11	19	4	2025	2	2025-10-03 19:25:09.848748+02
12	55	14	2025	2	2025-10-03 19:25:09.848748+02
13	30	10	2025	2	2025-10-03 19:25:09.848748+02
14	122	2	2025	2	2025-10-03 19:25:09.848748+02
15	2	2	2025	2	2025-10-03 19:25:09.848748+02
16	57	20	2025	2	2025-10-03 19:25:09.848748+02
17	125	7	2025	2	2025-10-03 19:25:09.848748+02
18	124	4	2025	2	2025-10-03 19:25:09.848748+02
19	123	3	2025	2	2025-10-03 19:25:09.848748+02
20	29	7	2025	2	2025-10-03 19:25:09.848748+02
21	10	3	2025	2	2025-10-03 19:25:09.848748+02
22	36	11	2025	2	2025-10-03 19:25:09.848748+02
23	59	1	2025	2	2025-10-03 19:25:09.848748+02
24	58	38	2025	2	2025-10-03 19:25:09.848748+02
25	54	13	2025	2	2025-10-03 19:25:09.848748+02
26	37	12	2025	2	2025-10-03 19:25:09.848748+02
27	56	19	2025	2	2025-10-03 19:25:09.848748+02
\.


--
-- Data for Name: student_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_modules (id, student_id, module_id, enrolled_at) FROM stdin;
1	1	1	2025-10-03 17:17:51.031719
\.


--
-- Data for Name: user_streams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_streams (id, user_id, stream_id, created_at) FROM stdin;
1	3	1	2025-10-03 15:26:34.575752+02
2	4	2	2025-10-03 15:26:34.575752+02
3	13	3	2025-10-03 15:26:34.575752+02
4	5	1	2025-10-03 15:26:34.575752+02
5	5	2	2025-10-03 15:26:34.575752+02
6	20	1	2025-10-03 16:20:02.779848+02
7	20	2	2025-10-03 16:20:02.779848+02
12	6	1	2025-10-03 16:33:58.945992+02
13	6	2	2025-10-03 16:33:58.945992+02
22	7	1	2025-10-03 16:49:10.967731+02
23	7	2	2025-10-03 16:49:10.967731+02
24	17	1	2025-10-03 16:49:10.967731+02
25	17	2	2025-10-03 16:49:10.967731+02
28	32	1	2025-10-03 16:49:10.967731+02
29	32	2	2025-10-03 16:49:10.967731+02
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, first_name, last_name, phone, created_at, updated_at, is_active) FROM stdin;
1	student1	student1@luct.ac.ls	$2a$10$example1	student	John	Doe	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
2	student2	student2@luct.ac.ls	$2a$10$example2	student	Jane	Smith	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
3	lecturer1	lecturer1@luct.ac.ls	$2a$10$example3	lecturer	Dr. Alice	Johnson	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
4	lecturer2	lecturer2@luct.ac.ls	$2a$10$example4	lecturer	Prof. Bob	Wilson	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
5	pl1	pl1@luct.ac.ls	$2a$10$example5	program_leader	Dr. Carol	Brown	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
6	prl1	prl1@luct.ac.ls	$2a$10$example6	principal_lecturer	Prof. David	Davis	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
7	fmg1	fmg1@luct.ac.ls	$2a$10$example7	faculty_manager	Dr. Emily	Taylor	\N	2025-10-03 15:22:15.001483+02	2025-10-03 15:22:15.001483+02	t
10	student3	student3@luct.ac.ls	$2a$10$example8	student	Peter	Ngugi	\N	2025-10-03 15:26:34.575752+02	2025-10-03 15:26:34.575752+02	t
13	lecturer3	lecturer3@luct.ac.ls	$2a$10$example9	lecturer	Grace	Motsoeneng	\N	2025-10-03 15:26:34.575752+02	2025-10-03 15:26:34.575752+02	t
17	fm1	fm1@example.com	$2a$10$lp/2OLC6BmjL2M8cJtaSsuTi92w7qdWNdv.ed0No3kzdjJfWsI9Hy	faculty_manager	Derek	Manager	\N	2025-10-03 15:50:58.873059+02	2025-10-03 15:50:58.873059+02	t
18	admin1	admin1@example.com	$2a$10$lp/2OLC6BmjL2M8cJtaSsuTi92w7qdWNdv.ed0No3kzdjJfWsI9Hy	admin	Erin	Admin	\N	2025-10-03 15:50:58.87678+02	2025-10-03 15:50:58.87678+02	t
19	Carol	thabotsehla@gmail.com	$2a$12$ijNkvRS2.Iy66UJbwppVm.rPk0U.veTQq8LT6bZ6Ju7ukJD2GptD2	student	Thabo	Tsehla	Carol	2025-10-03 16:09:02.259288+02	2025-10-03 16:09:02.259288+02	t
27	lec1	lec1@luct.ac.ls	placeholder	lecturer	Lebo	Mokoena	1111111	2025-10-03 16:33:42.398123+02	2025-10-03 16:33:42.398123+02	t
28	lec2	lec2@luct.ac.ls	placeholder	lecturer	Mpho	Kali	1111112	2025-10-03 16:33:42.398123+02	2025-10-03 16:33:42.398123+02	t
29	stu1	stu1@luct.ac.ls	placeholder	student	Neo	Maseko	3333331	2025-10-03 16:33:42.398123+02	2025-10-03 16:33:42.398123+02	t
30	stu2	stu2@luct.ac.ls	placeholder	student	Thato	Pule	3333332	2025-10-03 16:33:42.398123+02	2025-10-03 16:33:42.398123+02	t
32	Thabiso	thabisotsehla@gmail.com	$2a$12$CUCH/6h6x7S7Sn5krSJFWuUfA5AnbzSh1ZKCBx2I6YsXl7nd3NDBe	program_leader	Thabiso	Tsehlo	050000000	2025-10-03 16:38:50.382781+02	2025-10-03 16:38:50.382781+02	t
34	lec3	lec3@luct.ac.ls	placeholder	lecturer	Karabo	Ndlovu	5551113	2025-10-03 16:42:53.828278+02	2025-10-03 16:42:53.828278+02	t
35	lec4	lec4@luct.ac.ls	placeholder	lecturer	Nana	Dube	5551114	2025-10-03 16:42:53.828278+02	2025-10-03 16:42:53.828278+02	t
36	stu3	stu3@luct.ac.ls	placeholder	student	Kamo	Molefe	5552223	2025-10-03 16:42:53.828278+02	2025-10-03 16:42:53.828278+02	t
37	stu4	stu4@luct.ac.ls	placeholder	student	Boitumelo	Molekoa	5552224	2025-10-03 16:42:53.828278+02	2025-10-03 16:42:53.828278+02	t
48	lec5	lec5@luct.ac.ls	placeholder	lecturer	Neo	Khabo	1111115	2025-10-03 16:48:57.373008+02	2025-10-03 16:48:57.373008+02	t
49	lec6	lec6@luct.ac.ls	placeholder	lecturer	Thabo	Mothibi	1111116	2025-10-03 16:48:57.373008+02	2025-10-03 16:48:57.373008+02	t
54	stu5	stu5@luct.ac.ls	placeholder	student	Kea	Khune	3333335	2025-10-03 16:49:05.509962+02	2025-10-03 16:49:05.509962+02	t
55	stu6	stu6@luct.ac.ls	placeholder	student	Palesa	Ntuli	3333336	2025-10-03 16:49:05.509962+02	2025-10-03 16:49:05.509962+02	t
56	stu7	stu7@luct.ac.ls	placeholder	student	Refiloe	Mabuza	3333337	2025-10-03 16:49:05.509962+02	2025-10-03 16:49:05.509962+02	t
57	stu8	stu8@luct.ac.ls	placeholder	student	Mpho	Nkosi	3333338	2025-10-03 16:49:05.509962+02	2025-10-03 16:49:05.509962+02	t
58	stu9	stu9@luct.ac.ls	placeholder	student	Tshepo	Dhlamini	3333339	2025-10-03 16:49:05.509962+02	2025-10-03 16:49:05.509962+02	t
59	stu10	stu10@luct.ac.ls	placeholder	student	Nandi	Khoza	3333340	2025-10-03 16:49:05.509962+02	2025-10-03 16:49:05.509962+02	t
110	admin	admin@luct.ac.ls	placeholder	admin	System	Admin	0000000	2025-10-03 17:14:57.440687+02	2025-10-03 17:14:57.440687+02	t
120	Obed	lite-raph@outlook.com	$2a$12$2wiYBk4VIM2YY0TbvroUgeM2Cokjb.mUZ41qhK8ZiB1HhLWBxaaPm	lecturer	Obed	Tjabafu	050000000	2025-10-03 17:28:03.649962+02	2025-10-03 17:28:03.649962+02	t
121	obed.t	obed@luct.ac.ls	placeholder	lecturer	Obed	Tjabafu	1111199	2025-10-03 17:31:36.292034+02	2025-10-03 17:31:36.292034+02	t
122	stuB	stuB@luct.ac.ls	placeholder	student	Sello	Rama	3333392	2025-10-03 17:33:36.648279+02	2025-10-03 17:33:36.648279+02	t
123	stuA	stuA@luct.ac.ls	placeholder	student	Lerato	Khumalo	3333391	2025-10-03 17:33:36.648279+02	2025-10-03 17:33:36.648279+02	t
124	stuD	stuD@luct.ac.ls	placeholder	student	Jabulani	Maseko	3333394	2025-10-03 17:33:36.648279+02	2025-10-03 17:33:36.648279+02	t
125	stuC	stuC@luct.ac.ls	placeholder	student	Naledi	Phiri	3333393	2025-10-03 17:33:36.648279+02	2025-10-03 17:33:36.648279+02	t
128	admin2	admin@gmail.com	$2a$12$I7uguaVp7rNU2wzk8sba1eBHfdaIhfC7tlPFQMBk8pgidJGRSsnlS	admin	System	Administrator	\N	2025-10-05 22:05:21.309497+02	2025-10-05 23:38:16.243338+02	t
126	Admin	admin31@gmail.com	$2a$12$7L6IJYP8iI4OYSyOT2Do3ewSDXqdWCkZxeLzBBPd5v08CLryHslH.	admin	System	Administrator	\N	2025-10-05 20:58:48.620137+02	2025-10-05 23:41:09.050578+02	t
20	Justice	tsepangtsehla31@gmail.com	$2a$12$uhOo6enHvP4hN8lcHn634uPz.qwWcW3QmQNSsSSiaGzs5cHo6OO9G	program_leader	TSEPANG	TSEHLA	+26658042762	2025-10-03 16:12:02.14722+02	2025-10-07 16:05:46.321994+02	t
129	Thiza	thabo@gmail.com	$2a$12$ls.FWu9w6aUF4wwyGNnQR.VmY9LaN2wU44gv5vVYBagRr69NNmvfa	program_leader	Thabo	Nkoe	\N	2025-10-07 16:19:24.808799+02	2025-10-07 16:19:24.808799+02	t
\.


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 1, false);


--
-- Name: attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attachments_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, true);


--
-- Name: class_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_ratings_id_seq', 52, true);


--
-- Name: classes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classes_id_seq', 13, true);


--
-- Name: course_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_assignments_id_seq', 1, true);


--
-- Name: course_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_materials_id_seq', 1, false);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_id_seq', 51, true);


--
-- Name: feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feedback_id_seq', 27, true);


--
-- Name: lecturer_courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lecturer_courses_id_seq', 78, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modules_id_seq', 2, true);


--
-- Name: monitoring_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monitoring_id_seq', 1, true);


--
-- Name: notification_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: faculty_reporting_system
--

SELECT pg_catalog.setval('public.notification_reads_id_seq', 2, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_resets_id_seq', 1, false);


--
-- Name: progress_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.progress_tracking_id_seq', 7, true);


--
-- Name: report_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_attachments_id_seq', 4, true);


--
-- Name: report_workflow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_workflow_id_seq', 1, false);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 52, true);


--
-- Name: streams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.streams_id_seq', 25, true);


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_enrollments_id_seq', 27, true);


--
-- Name: student_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_modules_id_seq', 1, true);


--
-- Name: user_streams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_streams_id_seq', 53, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 129, true);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: class_enrollments class_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_pkey PRIMARY KEY (student_id, class_id);


--
-- Name: class_ratings class_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_ratings
    ADD CONSTRAINT class_ratings_pkey PRIMARY KEY (id);


--
-- Name: classes classes_class_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_class_code_key UNIQUE (class_code);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: course_assignments course_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_pkey PRIMARY KEY (id);


--
-- Name: course_materials course_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_materials
    ADD CONSTRAINT course_materials_pkey PRIMARY KEY (id);


--
-- Name: courses courses_course_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_code_key UNIQUE (course_code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: lecturer_classes lecturer_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_classes
    ADD CONSTRAINT lecturer_classes_pkey PRIMARY KEY (lecturer_id, class_id);


--
-- Name: lecturer_courses lecturer_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_courses
    ADD CONSTRAINT lecturer_courses_pkey PRIMARY KEY (id);


--
-- Name: modules modules_module_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_module_code_key UNIQUE (module_code);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: monitoring monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitoring
    ADD CONSTRAINT monitoring_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: faculty_reporting_system
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_user_id_type_source_id_key; Type: CONSTRAINT; Schema: public; Owner: faculty_reporting_system
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_type_source_id_key UNIQUE (user_id, type, source_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: progress_tracking progress_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_tracking
    ADD CONSTRAINT progress_tracking_pkey PRIMARY KEY (id);


--
-- Name: report_attachments report_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_pkey PRIMARY KEY (id);


--
-- Name: report_workflow report_workflow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_workflow
    ADD CONSTRAINT report_workflow_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: streams streams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);


--
-- Name: streams streams_stream_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_stream_code_key UNIQUE (stream_code);


--
-- Name: student_enrollments student_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_pkey PRIMARY KEY (id);


--
-- Name: student_modules student_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_modules
    ADD CONSTRAINT student_modules_pkey PRIMARY KEY (id);


--
-- Name: student_modules student_modules_student_id_module_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_modules
    ADD CONSTRAINT student_modules_student_id_module_id_key UNIQUE (student_id, module_id);


--
-- Name: user_streams unique_user_stream; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_streams
    ADD CONSTRAINT unique_user_stream UNIQUE (user_id, stream_id);


--
-- Name: user_streams user_streams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_streams
    ADD CONSTRAINT user_streams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_class_ratings_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_ratings_course ON public.class_ratings USING btree (course_id);


--
-- Name: idx_class_ratings_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_ratings_course_id ON public.class_ratings USING btree (course_id);


--
-- Name: idx_class_ratings_lecturer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_ratings_lecturer_id ON public.class_ratings USING btree (lecturer_id);


--
-- Name: idx_class_ratings_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_ratings_student ON public.class_ratings USING btree (student_id);


--
-- Name: idx_courses_stream_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_courses_stream_id ON public.courses USING btree (stream_id);


--
-- Name: idx_feedback_report; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_report ON public.feedback USING btree (report_id);


--
-- Name: idx_feedback_report_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_report_id ON public.feedback USING btree (report_id);


--
-- Name: idx_feedback_to_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_to_id ON public.feedback USING btree (feedback_to_id);


--
-- Name: idx_lecturer_courses_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lecturer_courses_course_id ON public.lecturer_courses USING btree (course_id);


--
-- Name: idx_lecturer_courses_lecturer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lecturer_courses_lecturer_id ON public.lecturer_courses USING btree (lecturer_id);


--
-- Name: idx_progress_tracking_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_tracking_course_id ON public.progress_tracking USING btree (course_id);


--
-- Name: idx_progress_tracking_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_tracking_student_id ON public.progress_tracking USING btree (student_id);


--
-- Name: idx_reports_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_course ON public.reports USING btree (course_id);


--
-- Name: idx_reports_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_course_id ON public.reports USING btree (course_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at);


--
-- Name: idx_reports_reporter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_reporter ON public.reports USING btree (reporter_id);


--
-- Name: idx_reports_reporter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_streams_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_streams_name ON public.streams USING btree (stream_name);


--
-- Name: idx_student_enrollments_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_enrollments_course_id ON public.student_enrollments USING btree (course_id);


--
-- Name: idx_student_enrollments_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_enrollments_student_id ON public.student_enrollments USING btree (student_id);


--
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_role ON public.users USING btree (role);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: users_username_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_unique ON public.users USING btree (username) WHERE (username IS NOT NULL);


--
-- Name: progress_tracking trg_progress_set_last_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_progress_set_last_updated BEFORE UPDATE ON public.progress_tracking FOR EACH ROW EXECUTE FUNCTION public.set_last_updated();


--
-- Name: reports trg_reports_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_set_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: class_enrollments class_enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_enrollments class_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: class_ratings class_ratings_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_ratings
    ADD CONSTRAINT class_ratings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: class_ratings class_ratings_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_ratings
    ADD CONSTRAINT class_ratings_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: class_ratings class_ratings_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_ratings
    ADD CONSTRAINT class_ratings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classes classes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_assignments course_assignments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_assignments course_assignments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: courses courses_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_feedback_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_feedback_from_id_fkey FOREIGN KEY (feedback_from_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_feedback_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_feedback_to_id_fkey FOREIGN KEY (feedback_to_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: lecturer_classes lecturer_classes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_classes
    ADD CONSTRAINT lecturer_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: lecturer_classes lecturer_classes_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_classes
    ADD CONSTRAINT lecturer_classes_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lecturer_courses lecturer_courses_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_courses
    ADD CONSTRAINT lecturer_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: lecturer_courses lecturer_courses_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_courses
    ADD CONSTRAINT lecturer_courses_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: progress_tracking progress_tracking_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_tracking
    ADD CONSTRAINT progress_tracking_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: progress_tracking progress_tracking_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_tracking
    ADD CONSTRAINT progress_tracking_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: report_attachments report_attachments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports reports_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_enrollments student_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: student_enrollments student_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_modules student_modules_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_modules
    ADD CONSTRAINT student_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: student_modules student_modules_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_modules
    ADD CONSTRAINT student_modules_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_streams user_streams_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_streams
    ADD CONSTRAINT user_streams_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;


--
-- Name: user_streams user_streams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_streams
    ADD CONSTRAINT user_streams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO faculty_reporting_system;


--
-- Name: TABLE api_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.api_keys TO faculty_reporting_system;


--
-- Name: SEQUENCE api_keys_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.api_keys_id_seq TO faculty_reporting_system;


--
-- Name: TABLE attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.attachments TO faculty_reporting_system;


--
-- Name: SEQUENCE attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.attachments_id_seq TO faculty_reporting_system;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO faculty_reporting_system;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO faculty_reporting_system;


--
-- Name: TABLE class_enrollments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.class_enrollments TO faculty_reporting_system;


--
-- Name: TABLE class_ratings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.class_ratings TO faculty_reporting_system;


--
-- Name: SEQUENCE class_ratings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.class_ratings_id_seq TO faculty_reporting_system;


--
-- Name: TABLE classes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.classes TO faculty_reporting_system;


--
-- Name: SEQUENCE classes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.classes_id_seq TO faculty_reporting_system;


--
-- Name: TABLE course_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.course_assignments TO faculty_reporting_system;


--
-- Name: SEQUENCE course_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.course_assignments_id_seq TO faculty_reporting_system;


--
-- Name: TABLE course_materials; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.course_materials TO faculty_reporting_system;


--
-- Name: SEQUENCE course_materials_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.course_materials_id_seq TO faculty_reporting_system;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.courses TO faculty_reporting_system;


--
-- Name: SEQUENCE courses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.courses_id_seq TO faculty_reporting_system;


--
-- Name: TABLE feedback; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedback TO faculty_reporting_system;


--
-- Name: SEQUENCE feedback_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.feedback_id_seq TO faculty_reporting_system;


--
-- Name: TABLE lecturer_classes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lecturer_classes TO faculty_reporting_system;


--
-- Name: TABLE lecturer_courses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lecturer_courses TO faculty_reporting_system;


--
-- Name: SEQUENCE lecturer_courses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.lecturer_courses_id_seq TO faculty_reporting_system;


--
-- Name: TABLE modules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.modules TO faculty_reporting_system;


--
-- Name: SEQUENCE modules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.modules_id_seq TO faculty_reporting_system;


--
-- Name: TABLE monitoring; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.monitoring TO faculty_reporting_system;


--
-- Name: SEQUENCE monitoring_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.monitoring_id_seq TO faculty_reporting_system;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO faculty_reporting_system;


--
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO faculty_reporting_system;


--
-- Name: TABLE password_resets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_resets TO faculty_reporting_system;


--
-- Name: SEQUENCE password_resets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.password_resets_id_seq TO faculty_reporting_system;


--
-- Name: TABLE progress_tracking; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.progress_tracking TO faculty_reporting_system;


--
-- Name: SEQUENCE progress_tracking_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.progress_tracking_id_seq TO faculty_reporting_system;


--
-- Name: TABLE report_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_attachments TO faculty_reporting_system;


--
-- Name: SEQUENCE report_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_attachments_id_seq TO faculty_reporting_system;


--
-- Name: TABLE report_workflow; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_workflow TO faculty_reporting_system;


--
-- Name: SEQUENCE report_workflow_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_workflow_id_seq TO faculty_reporting_system;


--
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reports TO faculty_reporting_system;


--
-- Name: SEQUENCE reports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reports_id_seq TO faculty_reporting_system;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO faculty_reporting_system;


--
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.settings TO faculty_reporting_system;


--
-- Name: TABLE streams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.streams TO faculty_reporting_system;


--
-- Name: SEQUENCE streams_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.streams_id_seq TO faculty_reporting_system;


--
-- Name: TABLE student_enrollments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.student_enrollments TO faculty_reporting_system;


--
-- Name: SEQUENCE student_enrollments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.student_enrollments_id_seq TO faculty_reporting_system;


--
-- Name: TABLE student_modules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.student_modules TO faculty_reporting_system;


--
-- Name: SEQUENCE student_modules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.student_modules_id_seq TO faculty_reporting_system;


--
-- Name: TABLE user_streams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_streams TO faculty_reporting_system;


--
-- Name: SEQUENCE user_streams_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_streams_id_seq TO faculty_reporting_system;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO faculty_reporting_system;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO faculty_reporting_system;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO faculty_reporting_system;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO faculty_reporting_system;


--
-- PostgreSQL database dump complete
--

