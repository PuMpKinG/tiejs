/*!
 TieJS - http://develman.github.io/tiejs
 Licensed under the MIT license

 Copyright (c) 2014 Georg Henkel <georg@develman.de>

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// AMD support
(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // using AMD; register as anon module
        define(['jquery'], factory);
    } else {
        // no AMD; invoke directly
        factory(jQuery);
    }
}

(function ($) {
    "use strict";

    var TieJS = function (form, options) {
        var self = $(this);
        var $form = $(form);
        var fieldNames = [];

        // settings
        var settings = $.extend({
            showRequiredAsterisk: true,
            formName: null,
            bindingSource: {},
            onSubmit: function () {
            }
        }, options);

        _initForm();

        this.addFields = function (fields) {
            $.each(fields, function (index, field) {
                if (field.data) {
                    $form.append(_addField(field.type, field.data));
                    if (_findInArray(field.data.name, fieldNames) === null) {
                        fieldNames.push({name: field.data.name, binding: ""});
                    }
                }
            });

            return this;
        };

        this.addColumns = function (columns) {
            if (columns.length > 0) {
                $form.append(_addColumns(columns, fieldNames));
            }

            return this;
        };

        this.addBindings = function (bindings) {
            if (settings.bindingSource) {
                $.each(bindings, function (index, binding) {
                    $.each(binding, function (fieldName, property) {
                        _bind($form, settings.bindingSource, fieldName, property);

                        var fieldNameData = _findInArray(fieldName, fieldNames);
                        fieldNameData.binding = property;
                    });
                });
            }

            return this;
        };

        this.captureFields = function () {
            $form.find('.form-control').each(function (index, field) {
                var fieldName = $(field).attr('name');
                if (_findInArray(fieldName, fieldNames) === null) {
                    fieldNames.push({name: fieldName, binding: ""});
                }
            });

            return this;
        };

        this.updateSettings = function (newSettings) {
            $.extend(settings, newSettings);
            this.reload();
        };

        this.reload = function () {
            _clearMarker($form);

            $.each(fieldNames, function (index, fieldNameData) {
                _bind($form, settings.bindingSource, fieldNameData.name, fieldNameData.binding);
            });
        };

        this.markFieldError = function (fieldNames) {
            $.each(fieldNames, function (index, fieldName) {
                var field = $form.find('[name=' + fieldName + ']');
                _addFieldError(field);
            });
        };

        function _initForm() {
            if (settings.formName) {
                $form.attr('name', settings.formName);
            }

            if (settings.showRequiredAsterisk) {
                var info = $("<p class='required-info'>Mit <span class='required-sign'>*</span> markierte Felder sind Pflichtfelder</p>");
                $form.prepend(info);
            }

            $form.addClass("tiejs-form");
            $form.on('submit', function (e) {
                e.preventDefault();

                if (_validate($form, fieldNames)) {
                    settings.onSubmit();
                }
            });
        }

        var _addField = function (type, data) {
            var field = null;
            switch (type) {
                case 'text':
                case 'number':
                case 'time':
                case 'date':
                case 'email':
                case 'password':
                case 'regex':
                    field = _defaultField(type, data);
                    break;
                case 'checkbox':
                    field = _checkboxField(data);
                    break;
                case 'radio':
                    field = _radioField(data);
                    break;
                case 'select':
                    field = _selectField(data);
                    break;
                case 'color':
                    field = _colorField(data);
                    break;
                case 'longtext':
                    field = _textareaField(data);
                    break;
                case 'button':
                    field = _button(data);
                    break;
            }

            return field;
        };

        var _addColumns = function (columns, fieldNames) {
            var row = $("<div></div>");
            row.addClass("row");

            $.each(columns, function (index, field) {
                var column = $("<div></div>");
                column.addClass("col-md-6");

                if (field.data) {
                    column.append(_addField(field.type, field.data));
                    if (_findInArray(field.data.name, fieldNames) === null) {
                        fieldNames.push({name: field.data.name, binding: ""});
                    }
                }

                row.append(column);
            });

            return row;
        };

        var _bind = function ($obj, bindingSource, fieldName, property) {
            var field = $obj.find('[name=' + fieldName + ']');

            if (field && typeof (bindingSource[property]) !== 'undefined') {
                var type = field.attr('type');
                if (field.is("select")) {
                    type = 'select';
                }

                field.on("change", function () {
                    switch (type) {
                        case 'checkbox':
                            var value = field.is(':checked') ? 1 : 0;
                            bindingSource[property] = value;
                            break;
                        case 'radio':
                            var value = $obj.find('input[name=' + fieldName + ']:checked').val();
                            bindingSource[property] = value;
                            break;
                        case 'select':
                            var value = $obj.find('select[name=' + fieldName + '] option:selected').val();
                            bindingSource[property] = value;
                            break;
                        default:
                            bindingSource[property] = field.val();
                    }
                });

                _updateFieldData(field, bindingSource, property);
            }
        };

        var _validate = function ($obj, fieldNames) {
            _clearMarker($obj);

            var isValid = true;
            $.each(fieldNames, function (index, fieldNameData) {
                var field = $obj.find('[name=' + fieldNameData.name + ']');

                var value = field.val();
                if (_hasAttribute(field, 'required')) {
                    if (!value || (field.is("select") && value == '0')) {
                        isValid = false;
                        _addFieldError(field);
                    }
                }

                var type = field.attr('type');
                switch (type) {
                    case 'number':
                        if (value && !$.isNumeric(value)) {
                            isValid = false;
                            _addFieldError(field);
                        }
                        break;

                    case 'email':
                        var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                        if (value && !regex.test(value)) {
                            isValid = false;
                            _addFieldError(field);
                        }
                        break;
                }

                var regexStr = field.attr('data-regex');
                if(regexStr){
                    var regex = new RegExp(regexStr);
                    if (value && !regex.test(value)) {
                        isValid = false;
                        _addFieldError(field);
                    }
                }

            });

            if (!isValid) {
                _addFormError($obj);
            }

            return isValid;
        };

        var _defaultField = function (type, data) {
            var formGroup = $("<div></div>");
            formGroup.addClass("form-group");

            var label = data.label;
            if (settings.showRequiredAsterisk && data.required) {
                label += "<span class='required-sign'>*</span>";
            }

            formGroup.append("<label class='control-label'>" + label + ":</label>");
            var input = "<input type='" + type + "' name='" + data.name + "' class='form-control'";

            if (data.css) {
                input = input.slice(0, -1);
                input += " " + data.css + "'";
            }

            if (data.placeholder) {
                input += " placeholder='" + data.placeholder + "'";
            }

            if (data.attributes) {
                input += " " + data.attributes;
            }

            if (data.required) {
                input += " required";
            }

            if(data.regex) {
                input += " data-regex='" + data.regex + "'";
            }

            input += " />";
            formGroup.append(input);

            return formGroup;
        };

        var _checkboxField = function (data) {
            var checkboxDiv = $("<div></div>");
            checkboxDiv.addClass("checkbox");

            var label = $("<label></label>");
            label.addClass("control-label");

            var input = "<input type='checkbox' name='" + data.name + "'";

            if (data.css) {
                input += " class='" + data.css + "'";
            }

            if (data.attributes) {
                input += " " + data.attributes;
            }

            if (data.required) {
                input += " required";
            }

            input += " />";
            label.append(input);

            var dataLabel = data.label;
            if (settings.showRequiredAsterisk && data.required) {
                dataLabel += "<span class='required-sign'>*</span>";
            }

            label.append(dataLabel);
            checkboxDiv.append(label);

            return checkboxDiv;
        };

        var _radioField = function (data) {
            var radioDiv = $("<div></div>");
            radioDiv.addClass("radio");

            var label = $("<label></label>");
            label.addClass("control-label");

            var input = "<input type='radio' name='" + data.name + "'";

            if (data.css) {
                input += " class='" + data.css + "'";
            }

            if (data.attributes) {
                input += " " + data.attributes;
            }

            if (data.required) {
                input += " required";
            }

            input += " />";
            label.append(input);

            var dataLabel = data.label;
            if (settings.showRequiredAsterisk && data.required) {
                dataLabel += "<span class='required-sign'>*</span>";
            }

            label.append(dataLabel);
            radioDiv.append(label);

            return radioDiv;
        };

        var _selectField = function (data) {
            var formGroup = $("<div></div>");
            formGroup.addClass("form-group");

            var label = data.label;
            if (settings.showRequiredAsterisk && data.required) {
                label += "<span class='required-sign'>*</span>";
            }

            formGroup.append("<label class='control-label'>" + label + ":</label>");
            var select = "<select name='" + data.name + "' class='form-control'";

            if (data.css) {
                select = input.slice(0, -1);
                select += " " + data.css + "'";
            }

            if (data.attributes) {
                select += " " + data.attributes;
            }

            if (data.required) {
                select += " required";
            }

            select += ">"

            if (data.placeholder) {
                select += "<option value='0' disabled selected>" + data.placeholder + "</option>";
            }

            if (data.options) {
                $.each(data.options, function (idx, option) {
                    select += "<option value='" + option.id + "'>" + option.name + "</option>";
                });
            }

            select += "</select>";
            formGroup.append(select);
            return formGroup;
        };

        var _colorField = function (data) {
            var formGroup = $("<div></div>");
            formGroup.addClass("form-group");

            var label = data.label;
            if (settings.showRequiredAsterisk && data.required) {
                label += "<span class='required-sign'>*</span>";
            }

            formGroup.append("<label class='control-label'>" + label + ":</label>");

            var inputGroup = $("<div></div>");
            inputGroup.addClass("input-group color");

            var input = "<input type='text' name='" + data.name + "' class='form-control'";

            if (data.css) {
                input = input.slice(0, -1);
                input += " " + data.css + "'";
            }

            if (data.placeholder) {
                input += " placeholder='" + data.placeholder + "'";
            }

            if (data.attributes) {
                input += " " + data.attributes;
            }

            if (data.required) {
                input += " required";
            }

            input += " />";

            var groupAddon = $("<span></span>");
            groupAddon.addClass("input-group-addon");
            groupAddon.html("<i></i>");

            inputGroup.append(input);
            inputGroup.append(groupAddon);
            formGroup.append(inputGroup);

            return formGroup;
        };

        var _textareaField = function (data) {
            var formGroup = $("<div></div>");
            formGroup.addClass("form-group");

            var label = data.label;
            if (settings.showRequiredAsterisk && data.required) {
                label += "<span class='required-sign'>*</span>";
            }

            formGroup.append("<label class='control-label'>" + label + ":</label>");
            var textarea = "<textarea name='" + data.name + "' class='form-control'";

            if (data.css) {
                textarea = textarea.slice(0, -1);
                textarea += " " + data.css + "'";
            }


            if (data.placeholder) {
                textarea += " placeholder='" + data.placeholder + "'";
            }

            if (data.attributes) {
                textarea += " " + data.attributes;
            }

            if (data.required) {
                textarea += " required";
            }

            textarea += "></textarea>";
            formGroup.append(textarea);

            return formGroup;
        };

        var _button = function (data) {
            var formGroup = $("<div></div>");
            formGroup.addClass("form-group");

            var button = "<button type='button' class='btn btn-default'";

            if (data.css) {
                button = button.slice(0, -1);
                button += " " + data.css + "'";
            }

            button += ">" + data.label + "</button>";

            formGroup.append(button);

            if(data.clickCB){
                var btn = formGroup.find("button");
                $(btn).on("click", data.clickCB);
            }

            return formGroup;
        };

        function _clearMarker($obj) {
            $obj.find('div.alert').remove();
            $obj.find('.form-group').each(function (index, value) {
                $(value).removeClass('has-error has-feedback');
                $(value).find('.form-control-feedback').remove();
            });
        }

        function _hasAttribute(field, attribute) {
            var attr = $(field).attr(attribute);
            return typeof attr !== 'undefined' && attr !== false;
        }

        function _addFormError(form) {
            var error = $("<div></div>");
            error.addClass("alert alert-danger");
            error.text("Bitte beheben Sie die im Formular hervorgehobenen Fehler");

            form.prepend(error);
        }

        function _addFieldError(field) {
            var $formGroup = field.parent();
            if ($formGroup.hasClass('input-group')) {
                $formGroup = $formGroup.parent();
            }

            $formGroup.addClass('has-error has-feedback');

            if (field.is("select")) {
                $formGroup.append("<span class='fa fa-times form-control-feedback feedback-select'></span>");
            } else {
                $formGroup.append("<span class='fa fa-times form-control-feedback'></span>");
            }
        }

        function _updateFieldData(field, bindingSource, property) {
            var type = field.attr('type');
            switch (type) {
                case 'checkbox':
                    var state = bindingSource[property];
                    if (state == 0) {
                        field.prop('checked', false);
                    } else {
                        field.prop('checked', true);
                    }
                    break;

                case 'radio':
                    field.val([bindingSource[property]]);
                    break;

                default:
                    var value = bindingSource[property];
                    field.val(value);
            }
        }

        function _findInArray(value, array) {
            for (var i = 0; i < array.length; i++) {
                var obj = array[i];
                if (obj.name === value) {
                    return obj;
                }
            }

            return null;
        }
    };

    $.fn.TieJS = function (options) {
        return this.each(function () {
            var element = $(this);

            // check if already initialized
            if (element.data('tiejs')) {
                return;
            }

            element.data('tiejs', new TieJS(this, options));
        });
    };
}));
