import app from 'flarum/app';
import Component from 'flarum/Component';
import Button from 'flarum/components/Button';
import Switch from 'flarum/components/Switch';
import saveSettings from 'flarum/utils/saveSettings';
import TabbedEditor from './TabbedEditor';

/* global m */

const TABS = [
    {
        key: 'admin_js',
        mode: 'javascript',
        title: 'Admin JS',
    },
    {
        key: 'forum_js',
        mode: 'javascript',
        title: 'Forum JS',
    },
    {
        key: 'admin_less',
        mode: 'less',
        title: 'Admin Less',
    },
    {
        key: 'forum_less',
        mode: 'less',
        title: 'Forum Less',
    },
    {
        key: 'php',
        mode: 'php',
        title: 'PHP',
    },
];

export default class ScratchpadPage extends Component {
    init() {
        this.dirty = false;
        this.dirtyJs = false;
        this.saving = false;
        this.compiling = false;
    }

    compile(scratchpad) {
        this.compiling = true;

        app.request({
            method: 'POST',
            url: app.forum.attribute('apiUrl') + scratchpad.apiEndpoint() + '/compile',
        }).then(() => {
            this.compiling = false;
            m.redraw();
        }).catch(e => {
            this.compiling = false;
            m.redraw();
            throw e;
        });
    }

    view() {
        const {scratchpad} = this.props;

        const onchange = (key, value) => {
            scratchpad.pushAttributes({
                [key]: value,
            });

            this.dirty = true;

            if (key.indexOf('_js') !== -1) {
                this.dirtyJs = true;
            }

            m.redraw();
        };

        return m('.ScratchpadEditor', [
            m('.ScratchpadHeader', [
                m('input', {
                    className: 'FormControl',
                    type: 'text',
                    value: scratchpad.title(),
                    oninput: m.withAttr('value', value => {
                        scratchpad.pushAttributes({
                            title: value,
                        });
                        this.dirty = true;
                    }),
                }),
                Switch.component({
                    state: app.data.settings['scratchpad.compileAutomatically'] === '1',
                    onchange: state => {
                        saveSettings({
                            'scratchpad.compileAutomatically': state ? '1' : '0',
                        });
                    },
                    children: 'Compile JS automatically',
                }),
                Switch.component({
                    state: app.data.settings['scratchpad.singleColumn'] === '1',
                    onchange: state => {
                        saveSettings({
                            'scratchpad.singleColumn': state ? '1' : '0',
                        });
                    },
                    children: 'Single column',
                }),
                Button.component({
                    className: 'Button',
                    onclick: () => {
                        this.saving = true;

                        const willBeNewOne = !scratchpad.exists;
                        const shouldRecompile = app.data.settings['scratchpad.compileAutomatically'] === '1' && this.dirtyJs;

                        scratchpad.save({
                            title: scratchpad.title(),
                            admin_js: scratchpad.admin_js(),
                            forum_js: scratchpad.forum_js(),
                            admin_less: scratchpad.admin_less(),
                            forum_less: scratchpad.forum_less(),
                            php: scratchpad.php(),
                        }).then(scratchpad => {
                            this.saving = false;
                            this.dirty = false;
                            this.dirtyJs = false;

                            if (willBeNewOne) {
                                this.props.oncreate(scratchpad);
                            }

                            if (shouldRecompile) {
                                this.compile(scratchpad);
                            }

                            m.redraw();
                        }).catch(e => {
                            this.saving = false;
                            m.redraw();
                            throw e;
                        });
                    },
                    children: 'Save',
                    icon: 'fas fa-save',
                    loading: this.saving,
                    disabled: !this.dirty && scratchpad.exists,
                }),
                Button.component({
                    className: 'Button',
                    onclick: () => {
                        this.compile(scratchpad);
                    },
                    children: 'Compile JS',
                    icon: 'fas fa-file-import',
                    loading: this.compiling,
                    disabled: !scratchpad.exists || app.data.settings['scratchpad.compileAutomatically'] === '1',
                }),
            ]),
            m('.ScratchpadColumns', app.data.settings['scratchpad.singleColumn'] === '1' ? TabbedEditor.component({
                tabs: TABS,
                scratchpad,
                onchange,
            }) : ['javascript', 'less', 'php'].map(mode => TabbedEditor.component({
                tabs: TABS.filter(tab => tab.mode === mode),
                scratchpad,
                onchange,
            }))),
        ]);
    }
}